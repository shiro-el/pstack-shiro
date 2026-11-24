# pstack in Claude Code

pstack skills use Cursor names. In Claude Code, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Cursor | Claude Code |
| --- | --- |
| `Task` | In T3 Code, use `delegate_task` for cross-model work, panels, and long background tasks; use native `Agent` for quick same-provider helpers. Outside T3 Code, use `Agent`. |
| `AskQuestion` | `AskUserQuestion`. In `-p` mode it is absent, so ask in plain text. |
| Open a todolist | Use `TodoWrite` if the session offers it. Otherwise skip the list; do not keep it in your reply. |
| Run another pstack skill (`/name` or "the **name** skill") | `Read` `<pstack>/skills/<name>/SKILL.md` and follow it. The `Skill` tool refuses most pstack skills. When you tell the user to type it, write `/pstack:<name>`. |
| `Grep`, `Glob` | `Bash` with `rg` when the session has no `Grep` or `Glob`. |
| `/loop` typed by the user | Claude Code's own `/loop`. It works as the skill describes. |
| A step that tells you to run under `/loop`, arm a watcher, or wake on an event | You cannot start `/loop` yourself, so arm the wake directly. For one event, such as a PR verdict or a CI run ending, run a command that exits on that event with `Bash` `run_in_background: true`, such as the bare `watch-pr`. Its exit wakes you. For a line per event, use `Monitor` with `timeout_ms` at its maximum, and re-arm it each time it expires. For T3 Code `delegate_task` children, just end your turn — T3 wakes you when each child finishes. Only when nothing can signal the event: `ScheduleWakeup` if the user started this session with `/loop`, otherwise a one-shot `CronCreate`. Never end a turn while you wait on something with no wake armed, because nothing will prompt you again. |

## Subagent fields

For Claude Code native `Agent`, map Cursor fields as below. For T3 Code `delegate_task`, omit Claude-only `Agent` fields (`subagent_type`, `isolation`): pass `readonly: true` as an explicit "do not edit files" instruction (and verify `git status` afterward), pass `environment: "cloud"` by creating a git worktree and pointing the child's `cwd` at it (or using T3's worktree option), and include the absolute path to `pstack/agents/poteto-agent.md` or `worker.md` in the brief when a role needs it.

| Cursor | Claude Code (`Agent`) |
| --- | --- |
| `subagent_type: generalPurpose` | `subagent_type: "general-purpose"` |
| `poteto-agent`, `comment-sicko` | `pstack:poteto-agent`, `pstack:comment-sicko` |
| `readonly: true` | `subagent_type: "Explore"`. It keeps `Bash`, so the brief also says "do not edit files", and you check `git status` afterward. |
| `readonly: false` | `general-purpose`. It keeps the session's MCP servers. |
| `environment: "cloud"` | `isolation: "worktree"`. Name the branch or commit the worker checks out. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first. |
| `run_in_background: true` | Omit. Subagents run in the background by default and notify you when they finish. |
| `resume` | In T3 Code `delegate_task`, you may continue an existing child thread. In native `Agent`, spawn a new agent and paste the earlier result into its brief. |
| `file_attachments` | List the paths in the brief. |

## Models

| Cursor | Claude Code / T3 Code |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | In Claude Code `Agent`: `model: "opus"` and `effort: "xhigh"` (`opus`, `sonnet`, `haiku`, `fable`; drop `-fast`). In T3 Code `delegate_task`: map `claude-*` to `claudeAgent`, `gemini-*` to `antigravity`, `gpt-*` to `codex`, and pass the parenthesized `(effort)` as that provider's effort/reasoning option. |
| A `gemini-*` or `gpt-*` slug | In T3 Code, run it via `delegate_task` on `antigravity` or `codex` (for Codex, set `serviceTier: "default"`, or `"ultrafast"` for urgent work). Outside T3 Code, omit `model` so `Agent` runs on the session model, and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.claude/rules/pstack-models.md` (shared with Codex and Antigravity). `\|` separates preferred/fallback choices for a single agent; `,` separates concurrent seats in a panel or judge pool. Role lines in `pstack-models.md` take precedence over `poteto-mode`'s "Match the model to the job" table (use `## Tier defaults` in `pstack-models.md` when stepping up/down). |
| A panel line (`arena runners`, `architect runners`, `debate panel`, `interrogate reviewers`) | In T3 Code, spawn one `delegate_task` per comma-separated seat across the listed providers (`claudeAgent`, `antigravity`, `codex`). |
| A cross-judge pool (`arena cross-judge pool`, `debate judge pool`) | Pick an entry from a vendor other than the parent thread and run it via `delegate_task`. |

## T3 Code subagents

In T3 Code, use `delegate_task` for cross-model work, multi-family panels (`interrogate`, `architect`, `arena`, `debate`), and long background tasks so each child appears as a thread in the T3 UI where the user can inspect or steer it directly. For quick same-provider helper tasks, native `Agent` / subagent tools are fine.

- **No polling or wait scripts:** launch `delegate_task` children and end your turn. T3 wakes you automatically when a child finishes, and delivers its final reply to you.
- **Name the provider, model, and effort** in your reply for every child you start.
- **Debate rounds:** keep each debater in its own T3 child thread across rounds, or pass prior round files in the next turn's brief.
- **Long briefs:** put a long brief in a file and pass its path. Keep the absolute path to [worker.md](../../skills/poteto-mode/worker.md) in the initial kickoff even when the task brief is a file.
- **Large coordinator runs:** for more than three parallel agents or a ticket DAG, start one coordinator (`coordinator` role in `~/.claude/rules/pstack-models.md`) that manages workers and tracks progress in a state file (`STATE.md`).

## setup-pstack

Follow its steps and write the role lines to `~/.claude/rules/pstack-models.md` (with no frontmatter; Antigravity reads its frontmatter wrapper automatically). Preserve custom roles (`coordinator`, `ad-hoc`), `\|` fallback lists, and explicit `gemini-4-*` choices instead of replacing them with Cursor defaults.

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
