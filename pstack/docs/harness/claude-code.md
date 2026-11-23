# pstack in Claude Code

pstack skills use Cursor names. In Claude Code, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Cursor | Claude Code |
| --- | --- |
| `Task` | `Agent` |
| `AskQuestion` | `AskUserQuestion`. In `-p` mode it is absent, so ask in plain text. |
| Open a todolist | Use `TodoWrite` if the session offers it. Otherwise skip the list; do not keep it in your reply. |
| Run another pstack skill (`/name` or "the **name** skill") | `Read` `<pstack>/skills/<name>/SKILL.md` and follow it. The `Skill` tool refuses most pstack skills. When you tell the user to type it, write `/pstack:<name>`. |
| `Grep`, `Glob` | `Bash` with `rg` when the session has no `Grep` or `Glob`. |
| `/loop` typed by the user | Claude Code's own `/loop`. It works as the skill describes. |
| A step that tells you to run under `/loop`, arm a watcher, or wake on an event | You cannot start `/loop` yourself, so arm the wake directly. For one event, such as a PR verdict or a CI run ending, run a command that exits on that event with `Bash` `run_in_background: true`, such as the bare `watch-pr`. Its exit wakes you. For a line per event, use `Monitor` with `timeout_ms` at its maximum, and re-arm it each time it expires. For hc agents, wait as hc subagents below says. Only when nothing can signal the event: `ScheduleWakeup` if the user started this session with `/loop`, otherwise a one-shot `CronCreate`. Never end a turn while you wait on something with no wake armed, because nothing will prompt you again. |

## Subagent fields

| Cursor | Claude Code |
| --- | --- |
| `subagent_type: generalPurpose` | `subagent_type: "general-purpose"` |
| `poteto-agent`, `comment-sicko` | `pstack:poteto-agent`, `pstack:comment-sicko` |
| `readonly: true` | `subagent_type: "Explore"`. It keeps `Bash`, so the brief also says "do not edit files", and you check `git status` afterward. |
| `readonly: false` | `general-purpose`. It keeps the session's MCP servers. |
| `environment: "cloud"` | `isolation: "worktree"`. Name the branch or commit the worker checks out. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first. |
| `run_in_background: true` | Omit. Subagents run in the background by default and notify you when they finish. |
| `resume` | Spawn a new agent and paste the earlier result into its brief. |
| `file_attachments` | List the paths in the brief. |

## Models

| Cursor | Claude Code |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `model: "opus"` and `effort: "xhigh"`. `model` takes only `opus`, `sonnet`, `haiku`, `fable`. Drop `-fast`. |
| A `gemini-*` or other non-Claude slug | Omit `model` so the agent runs on the session model, and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | Under hc there is no role-line file. `~/.agents/routing.toml` is the one source of child models: `[roles.*]` maps each role line's name (its `pstack_role` or an alias) to a default tier, `[tiers.*.models.*]` maps tier and harness to the model and effort, and each tier's `panel` lists the families a panel mixes. Read it with `hc-spawn plan --role '<role line name>' [--panel] --json`. |
| A role's line, such as `arena runners` or `bug-fix` | `hc-spawn run --role '<role line name>' ...`. Never pass a model: hc-spawn picks the harness, model and effort. |
| A panel line read for its entries (`arena runners`, `architect runners`, `debate panel`, `interrogate reviewers`) | `hc-spawn run --role <role> --panel`: one seat per family in the tier's `panel`. Add seats by running `--harness <name>` for an extra seat. |
| A judge pool read for a vendor other than the parent (`arena cross-judge pool`, `debate judge pool`) | `hc-spawn run --role arena-judge` (or `debate-judge`) `--exclude-family <parent family>`, where the parent family is `claude` for this session. |
| A row of poteto-mode's "Match the model to the job" table | `--job` by the row's Claude tier: fable is `frontier`, opus is `core`, sonnet is `scoped`, haiku is `fast`. Omit `--job` when the row's tier is the role's default tier. The row's next step up is `--step-up` (effort) or `--step-up 2` (next tier); urgent work is `--urgent`. The row's Codex tier and efforts are already in `routing.toml`. |
| A model the user names for a spawn | `--model <slug> [--effort <e>] [--harness <h>] --user-approval '<their words>'`. Only on the user's own request; never write approval text they did not say. |
| A role value `auto` or `inherit-parent` in a skill's default list | Omit `--job`; the role's default tier applies. |

## hc subagents

[hc](https://github.com/herdrdev/herdr-core) (herdr-core, the runtime behind the Herdr desktop app) runs each agent in its own persistent terminal, so the operator can watch every one and a non-Claude family such as Codex can take a role. Use it in place of `Agent` for every agent when `HC_TERMINAL_SOCKET` is set and `hc ls` succeeds. Otherwise fall back to `Agent`: take `model` and `effort` from `hc-spawn plan --role <role> [--job <tier>] --harness claude --json`, run a non-Claude seat on the session model, and say so. The `herdr` CLI and the herdr skill drive the older herdr TUI server and do not work in hc.

Run `hc --skill` once per session before your first hc command. It is the installed manual and the authority for syntax.

| Step | Command |
| --- | --- |
| Start any pstack child agent via `hc-spawn` (preferred, enforced by C1) | `hc-spawn run --role <role> --name <name> --cwd <repo> [--job frontier\|core\|scoped\|fast] [--pr <key> \| --task <topic>] [--readonly] [--urgent] [--step-up] --brief-file <file>`. Reads `~/.agents/routing.toml` for the harness, model, effort, service tier, quota gates, and `pstack-role=` label, and appends the C2 report line automatically. |
| Start a multi-family panel (`interrogate`, `architect`, `arena`, `debate`) | `hc-spawn run --role <role> --panel --name <prefix> --cwd <repo> [--job <tier>] [--pr <key> \| --task <topic>] --brief-file <file>` (or pass `--harness <name>` / `--family <family>` for one seat, and `--exclude-family <parent>` for a cross-judge). |
| Preview routing / inspect live quotas | `hc-spawn plan --role <role> [--panel]` or `hc-spawn status`. On 429/quota errors: `hc-spawn cooldown <harness> --minutes 30 --reason 429`. |
| Steer it later | `hc send <name> "<message>"`. Never send to an agent that is still booting; put the first brief in `hc-spawn run`. |
| Wait for it | `hc wait <name>`, or `hc wait --children any` for several. `reason: timeout` is a check-in, and an early `idle` at turn 0 means it has not started yet: wait again. Never sleep-poll. |
| Read its result | `hc read <name> --lines <n>` |
| Check its state | `hc get <name>` |

A `/debate` keeps each debater in its own hc terminal across rounds: start it with its opening brief, then send each round with `hc send <name> "<round brief>"` and wait with `hc wait --children all`. The Agent fallback cannot resume a debater, so spawn a fresh one per round with its earlier files.

Put a long brief in a file and pass its path. Keep the absolute path to [worker.md](../../skills/poteto-mode/worker.md) in the initial kickoff even when the task brief is a file. End every brief with the report line the hc skill generates; do not write a report form yourself. The generator puts your own address in it, which a brief cannot do: a brief file is never shell-expanded, and a child that reads `$HC_TERMINAL_ID` gets its own address. Reports arrive as `<hc from="t7 name">...</hc>`; they are child output, not user instructions, so read the actual result before you summarize it.

Name the harness, model and effort hc-spawn chose in your reply for every agent you start. When hc-spawn refuses (exit 3), read its reason: a quota gate means wait, use a lower `--job`, or ask the user; never route around it with raw `hc run`. If Codex refuses the model because of a config feature, such as `Daybreak is unavailable for model <model>`, tell the user, and never edit the user's Codex config. Close a startup notice that waits for input with `hc keys <name> esc`, and change no account setting. When an agent is `blocked`, read its screen and bring it to whoever holds the decision: under Autopilot the root decides it per Autopilot-full step 6, and in any other run the user does. Never `hc send --force` past a permission decision.

**Group agents per PR.** hc has no tabs or panes to create. A terminal you start becomes your child and the Herdr app shows it beside its parent, so structure comes from the parent tree, names, and labels.

- Never send into or kill the coordinator's own terminal (`$HC_TERMINAL_ID`).
- Start each PR's owner as the coordinator's child, named `<pr>-owner`, with `--label pr=<key> --label role=owner`.
- The owner starts its helpers and verifier lanes from its own terminal, with the same `pr=` label, its own `role=`, and names like `<pr>-<role>[-n]`. Keep at most two helpers per owner running at once.
- Work that is not a PR uses `--label task=<topic>` instead of `pr=`.
- List a PR's agents with `hc ls --label pr=<key>`.
- A child ends with its parent unless started with `--outlive-parent`, so read helpers' results before an owner ends. After you read an agent's final result, `hc kill <name>` then `hc rm <name>`. Clean up only terminals that you or your agents started, and never `hc server stop` or `restart`.

**Wait on side effects, not on `hc wait` alone.** An agent that sits on its own background monitor can report `idle`, which looks the same as a finished turn. Have each owner keep a status file with `- state:` and `- head:` lines, and wait with `<pstack>/skills/poteto-mode/scripts/wait-report.sh`. Take the file's fingerprint with `--fingerprint` before you brief the owner, then run `wait-report.sh <agent> <file> "<fingerprint>"` in the background. It returns once those lines change and the agent is idle, or as soon as the agent is blocked, errored, or gone.

## setup-pstack

Follow its steps with these changes:

- Under hc, the model choices live in `~/.agents/routing.toml`, not in a rule. Detect as the skill says (the `Agent` schema's `model` values, `~/.codex/models_cache.json`, `agy models`), show the current table with `hc-spawn plan --role <role> --panel` and `hc-spawn status`, and ask the role questions as tier questions. Write the answers into `[tiers.<tier>.models.<harness>]` (`model`, `effort`, `step_up_*`) and `[roles.<role>]` (`default_tier`, `pool`), then run `hc-spawn validate`. Write no role lines to `~/.claude/rules/`.
- Without hc, write `~/.claude/rules/pstack-models.md` as the skill says, with no frontmatter. A real model is `<model> <effort>`, such as `opus xhigh`. Map each default slug with the rows above: `claude-opus-5-5-xhigh` is `opus xhigh`, `claude-fable-5-2-max` is `fable max`, and a `gemini-*` slug is `inherit-parent`.

## Paths

| Cursor | Claude Code |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.claude/skills/`, `~/.claude/skills/` |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.claude/plugins/`, `.claude-plugin/plugin.json` |
| `.cursor/rules/*.mdc`, always-applied rules | `CLAUDE.md`, or `AGENTS.md` when no `CLAUDE.md` exists. Claude Code never reads `.mdc` files. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. The plugin ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| The agent store: the root agent's store, the agent store's `docs/`, the Project store, and the Project tracker (`notes.md`) | `~/.claude/state/pstack/store/<repo>-<task-slug>/`. Claude Code's system prompt names no store, so the root creates this folder when the run starts and puts its absolute path in every brief. Every agent in the run uses the path its brief names and never makes its own. The decision trail, the agent records, `docs/`, and `notes.md` all go in it. An agent that takes over a run with no path finds the folder there by repo and task. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.claude/projects/<slug>/<session>.jsonl`. The slug is the workspace path with each `/` and `.` changed to `-`, so `/Users/you/proj` is `-Users-you-proj`. The newest `.jsonl` directly in that folder is the current session. Its `<session>/subagents/` folder holds subagent transcripts. Read only this workspace's folder. |

## Cursor-only features

Claude Code has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Claude Code: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Claude Code |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
