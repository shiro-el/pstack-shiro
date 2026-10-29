#!/usr/bin/env node
// Claude Code hooks that hold an Autopilot run to its playbooks across compaction.
// A session enters Autopilot only when the user invokes /pstack:poteto-mode and "autopilot" appears in that prompt,
// in the agent's reply to it, or in a tool call during that reply. The state lives outside the conversation.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude", "state", "pstack"), "autopilot");
const COMMAND = /^(pstack:)?poteto-mode$/;
const AUTOPILOT = /autopilot/i;
const WEEK = 7 * 24 * 60 * 60 * 1000;
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
const transcriptSize = () => (input.transcript_path && existsSync(input.transcript_path) ? statSync(input.transcript_path).size : 0);
// last_assistant_message holds only the turn's final text, so the turn's earlier assistant entries are read here.
const assistantSince = (offset) => {
  if (!input.transcript_path || !existsSync(input.transcript_path)) return "";
  return readFileSync(input.transcript_path).subarray(offset).toString("utf8").split("\n").flatMap((line) => {
    try {
      const entry = JSON.parse(line);
      return entry.type === "assistant" ? [JSON.stringify(entry.message?.content ?? "")] : [];
    } catch {
      return [];
    }
  }).join("\n");
};
const reply = (output) => process.stdout.write(JSON.stringify(output));
const deny = (reason) =>
  reply({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });

const handlers = {
  UserPromptExpansion() {
    if (!COMMAND.test(String(input.command_name ?? ""))) return;
    const text = `${input.command_args ?? ""} ${input.prompt ?? ""}`;
    const state = load();
    save({ ...state, listening: true, offset: transcriptSize(), autopilot: state.autopilot || AUTOPILOT.test(text) });
  },
  PostToolUse() {
    const state = load();
    if (state.listening && !state.autopilot && AUTOPILOT.test(JSON.stringify(input.tool_input ?? {}))) {
      save({ ...state, autopilot: true });
    }
  },
  Stop() {
    const state = load();
    if (!state.listening) return;
    const text = `${input.last_assistant_message ?? ""}\n${assistantSince(state.offset ?? 0)}`;
    save({ ...state, listening: false, autopilot: state.autopilot || AUTOPILOT.test(text) });
  },
  SessionStart() {
    if (!load().autopilot) return;
    const files = PLAYBOOKS.map((file) => join(PLUGIN, file)).filter(existsSync);
    const body = files.map((file) => `<file path="${file}">\n${readFileSync(file, "utf8")}\n</file>`).join("\n\n");
    reply({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          "This session is running a pstack Autopilot program that the user started with /pstack:poteto-mode. " +
          "The conversation was just compacted, so the summary above omits the playbooks. Their current text follows and governs the rest of the run.\n\n" +
          body,
      },
    });
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
