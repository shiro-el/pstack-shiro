import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";

const hook = join(import.meta.dirname, "..", "..", "pstack", "docs", "harness", "claude-code-hooks", "poteto-guard.mjs");
let dir: string;
let transcript: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "poteto-guard-"));
  transcript = join(dir, "transcript.jsonl");
  writeFileSync(transcript, "");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function fire(event: string, fields: Record<string, unknown> = {}) {
  const input = { session_id: "s1", transcript_path: transcript, hook_event_name: event, ...fields };
  const run = spawnSync("node", [hook], { input: JSON.stringify(input), env: { ...process.env, CLAUDE_PLUGIN_DATA: dir }, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}
const invoke = (args: string) => fire("UserPromptExpansion", { command_name: "pstack:poteto-mode", command_args: args });
const tool = (tool_name: string, tool_input: Record<string, unknown>) => fire("PostToolUse", { tool_name, tool_input });
const stop = (message: string) => fire("Stop", { last_assistant_message: message });
const asks = () => !fire("PreToolUse", { tool_name: "AskUserQuestion", tool_input: {} }).includes('"deny"');
const playbook = (name: string) => `/plugin/skills/poteto-mode/playbooks/${name}.md`;

test("an Idea to PRs run that only names Autopilot as a later stage can still ask the operator", () => {
  invoke("take this idea to PRs, then autopilot-stack the queue");
  tool("Read", { file_path: playbook("idea-to-prs") });
  tool("TodoWrite", { todos: [{ content: "Run the Autopilot-stack playbook on the queue" }] });
  stop("Path: Existing codebase. Next stage after grilling is autopilot-stack.");
  assert.ok(asks(), "grilling stage keeps AskUserQuestion");
});

test("reading an Autopilot playbook in a later turn of a poteto-mode session holds the run to it", () => {
  invoke("take this idea to PRs");
  stop("Path: Existing codebase.");
  tool("Read", { file_path: playbook("autopilot-stack") });
  assert.ok(!asks(), "Autopilot run denies AskUserQuestion");
});

test("a full autopilot request holds the run once its playbook is read", () => {
  invoke("full autopilot on .scratch/export/issues");
  tool("Bash", { command: `cat ${playbook("autopilot-full")}` });
  assert.ok(!asks(), "Autopilot run denies AskUserQuestion");
});

test("reading an Autopilot playbook outside poteto-mode leaves the session alone", () => {
  tool("Read", { file_path: playbook("autopilot-stack") });
  assert.ok(asks(), "no poteto-mode, no Autopilot");
});

const kickoff = (text: string) => fire("UserPromptSubmit", { prompt: text });
const opens = (command: string) => !fire("PreToolUse", { tool_name: "Bash", tool_input: { command } }).includes('"deny"');
const loadPrSkills = () => {
  tool("Skill", { skill: "cursor-team-kit:deslop" });
  for (const name of ["no-comments", "technical-writing", "unslop"]) tool("Read", { file_path: `/plugin/skills/${name}/SKILL.md` });
};

test("a poteto-mode child cannot open a PR before it loads the Opening a PR skills", () => {
  kickoff("[marker]\n/plugin/skills/poteto-mode/worker.md Read your full brief at /x/BRIEF.md");
  assert.ok(!opens("cd /repo && gh pr create --base main --title t --body b"), "PR create denied");
  loadPrSkills();
  assert.ok(opens("cd /repo && gh pr create --base main --title t --body b"), "PR create allowed once loaded");
});

test("rewriting a PR body counts as opening a PR, a status read does not", () => {
  invoke("issue #1");
  assert.ok(opens("gh pr view 12 --json body"), "read allowed");
  assert.ok(!opens("gh pr edit 12 --body-file /tmp/body.md"), "body rewrite denied");
});

test("a session that never ran poteto-mode opens PRs freely", () => {
  kickoff("fix the typo in README");
  assert.ok(opens("gh pr create --fill"), "no poteto-mode, no gate");
});
