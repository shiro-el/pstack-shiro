#!/usr/bin/env node
// Claude Code hooks that hold an Autopilot run to its playbooks across compaction.
// A session enters Autopilot only when the user has invoked /pstack:poteto-mode in it and the agent then reads an
// Autopilot playbook. A word in a prompt, reply, or todo is not the signal: Idea to PRs names Autopilot as a later stage
// while it is still grilling the operator, and its Autopilot stage starts turns after the invocation. The state lives
// outside the conversation.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude", "state", "pstack"), "autopilot");
const COMMAND = /^(pstack:)?poteto-mode$/;
const AUTOPILOT_PLAYBOOK = /playbooks\/autopilot-(full|stack)\.md/;
const READERS = new Set(["Read", "Bash"]);
const WEEK = 7 * 24 * 60 * 60 * 1000;
// Must match the number of SessionStart entries in hooks.json.
const SLOTS = 6;
const PART = 9000;
const PLAYBOOKS = [
  "skills/poteto-mode/SKILL.md",
  "skills/poteto-mode/playbooks/autopilot-full.md",
  "skills/poteto-mode/playbooks/autopilot-stack.md",
];

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const path = join(STATE, `${String(input.session_id ?? "unknown").replace(/[^\w-]/g, "_")}.json`);
const load = () => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
// Kept past SessionEnd, which also fires on /resume, so a resumed run keeps its state; a week of disuse drops it.
const save = (state) => {
  mkdirSync(STATE, { recursive: true });
  for (const name of readdirSync(STATE)) {
    const old = join(STATE, name);
    if (Date.now() - statSync(old).mtimeMs > WEEK) rmSync(old, { force: true });
  }
  writeFileSync(path, JSON.stringify(state));
};
const reply = (output) => process.stdout.write(JSON.stringify(output));
const deny = (reason) =>
  reply({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });

const handlers = {
  UserPromptExpansion() {
    if (!COMMAND.test(String(input.command_name ?? ""))) return;
    save({ ...load(), poteto: true });
  },
  PostToolUse() {
    const state = load();
    if (!state.poteto || state.autopilot || !READERS.has(input.tool_name)) return;
    if (AUTOPILOT_PLAYBOOK.test(JSON.stringify(input.tool_input ?? {}))) save({ ...state, autopilot: true });
  },
  // Claude Code files away any additionalContext over 10,000 characters, measuring each hook's output on its own,
  // so hooks.json runs one SessionStart hook per part and each emits the part named by its argument.
  SessionStart() {
    if (!load().autopilot) return;
    const parts = PLAYBOOKS.map((file) => join(PLUGIN, file)).filter(existsSync).flatMap((file) => {
      const pieces = split(readFileSync(file, "utf8"), PART);
      return pieces.map((piece, index) => `<file path="${file}" part="${index + 1} of ${pieces.length}">\n${piece}\n</file>`);
    });
    const index = Number(process.argv[2] ?? 0);
    const lead =
      `This session is running a pstack Autopilot program that the user started with /pstack:poteto-mode. The conversation was just compacted, ` +
      `so the summary omits the playbooks. Their current text arrives in ${parts.length} parts, one per SessionStart hook, and governs the rest of the run.`;
    const overflow = index === SLOTS - 1 && parts.length > SLOTS ? `\n\nParts ${SLOTS + 1} to ${parts.length} did not fit. Read them from the files named above before acting.` : "";
    if (index >= parts.length) return;
    reply({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: `${index === 0 ? `${lead}\n\n` : ""}${parts[index]}${overflow}` } });
  },
  PreToolUse() {
    if (!load().autopilot) return;
    if (input.tool_name === "AskUserQuestion") {
      deny(
        "This session runs a pstack Autopilot program under a full-autonomy grant. A product or scope call does not stop the run: " +
          "apply the default you would recommend, keep going, and report the call in your next reply with its options and what the operator could say to reverse it " +
          "(poteto-mode Non-negotiables; Autopilot-full step 6). Gates the operator named and the Always-pause list are raised in the reply text.",
      );
    } else if (input.tool_name === "CronCreate" && input.tool_input?.recurring !== false) {
      const cron = String(input.tool_input?.cron ?? "");
      const gap = shortestGap(cron);
      if (gap === undefined) return;
      if (gap >= 60) {
        deny(
          `This recurring job fires every ${gap} minutes or more. The prompt cache lasts at most an hour, so each tick re-reads the whole conversation uncached, ` +
            "and in an Autopilot run most ticks find nothing new. Wake on events instead (Autopilot-full step 6): a background Bash wait or a Monitor per agent " +
            "that returns on its milestone, a block, its exit, or its stuck-after runtime.",
        );
        return;
      }
      const state = load();
      const nudged = state.cronNudged ?? [];
      if (nudged.includes(cron)) return;
      save({ ...state, cronNudged: [...nudged, cron] });
      deny(
        `Before polling every ${gap} minutes, check whether a Monitor or a background Bash wait can watch the event itself, ` +
          "so you wake when it happens instead of on a clock (Autopilot-full step 6). If the work truly needs a clock, call CronCreate again with the same cron.",
      );
    }
  },
};

// The shortest time in minutes between two fires of a 5-field cron, over the next eight days.
function shortestGap(cron) {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return undefined;
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  const sets = fields.map((field, index) => expand(field, ...ranges[index]));
  if (sets.some((set) => set === undefined)) return undefined;
  if (sets[4].has(7)) sets[4].add(0);
  const [minutes, hours, days, months, weekdays] = sets;
  const anyDay = fields[2] === "*", anyWeekday = fields[4] === "*";
  const start = new Date();
  start.setSeconds(0, 0);
  let last, gap;
  for (let step = 1; step <= 8 * 24 * 60; step++) {
    const at = new Date(start.getTime() + step * 60000);
    const day = days.has(at.getDate()), weekday = weekdays.has(at.getDay());
    const dayMatch = anyDay || anyWeekday ? day && weekday : day || weekday;
    if (!minutes.has(at.getMinutes()) || !hours.has(at.getHours()) || !months.has(at.getMonth() + 1) || !dayMatch) continue;
    if (last !== undefined) gap = Math.min(gap ?? Infinity, step - last);
    last = step;
  }
  return gap ?? 8 * 24 * 60;
}

// Splits text into pieces of at most `size` characters, at line ends where it can.
function split(text, size) {
  const pieces = [];
  let rest = text;
  while (rest.length > size) {
    const cut = rest.lastIndexOf("\n", size);
    const at = cut > size / 2 ? cut + 1 : size;
    pieces.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  return [...pieces, rest];
}

function expand(field, low, high) {
  const set = new Set();
  for (const part of field.split(",")) {
    const match = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (!match) return undefined;
    const [from, to] = match[1] === "*" ? [low, high] : match[1].split("-").map(Number).concat(match[1].includes("-") ? [] : [match[2] ? high : Number(match[1])]);
    for (let value = from; value <= to; value += Number(match[2] ?? 1)) set.add(value);
  }
  return set;
}

handlers[input.hook_event_name]?.();
