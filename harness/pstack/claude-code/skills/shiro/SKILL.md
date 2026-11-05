---
name: shiro
description: Shiro's front door from an idea to shipped PRs. Picks the existing-codebase or from-scratch branch and starts its first step. Type /shiro with the idea, ticket, or queue.
disable-model-invocation: true
---

# Shiro

In Claude Code, read [the Claude Code adapter](../../docs/harness/claude-code.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to Claude Code.

Take what the user typed and start the step it is at. Each step ends on a state the next one starts from: name that state when it is reached, offer the next step, and let the user stop there.

## Pick the entry

Read the input and the repo, then start the first row that matches. Say which row in one line.

| The input is | Start |
|---|---|
| A ticket queue: a `.scratch/<slug>/issues/` folder or a `#N` list with "Blocked by" edges | `/poteto-mode autopilot-stack <the queue>`, or `full autopilot` when the user said to merge |
| A task that fits one PR | [`/poteto-mode`](../poteto-mode/SKILL.md) with the task |
| A cleared [`/wayfinder`](../wayfinder/SKILL.md) map, or a settled conversation | [`/to-spec`](../to-spec/SKILL.md) for a map, [`/to-tickets`](../to-tickets/SKILL.md) for a conversation |
| An idea bigger than one PR, in a repo with running code and tests | **Existing codebase**, step 1 |
| An idea in an empty repo, or one too foggy to settle in one chat | **From scratch**, step 1 |

Existing code means trunk behavior to compare against and an app to drive, which pstack's verification needs. When the repo has code but the idea is foggy, ask once which branch.

## Existing codebase

1. [`/grilling`](../grilling/SKILL.md) settles the intent until every decision is the user's.
2. A question only a run can answer (a state model, a layout, a timing) goes to `/poteto-mode prototype <question>`; its answer returns to the grilling.
3. [`/to-tickets`](../to-tickets/SKILL.md) in the same chat, before context clears, so the tickets carry the decisions.
4. `/poteto-mode autopilot-stack <the queue>` builds and verifies every ticket and hands the stack back to land.
5. [`/reflect`](../reflect/SKILL.md) turns what went wrong into skill edits.

## From scratch

1. [`/wayfinder`](../wayfinder/SKILL.md) charts the destination and a map of decision tickets, then resolves one per session until the way is clear.
2. [`/to-spec`](../to-spec/SKILL.md) collapses the map's decisions into one spec.
3. [`/to-tickets`](../to-tickets/SKILL.md) cuts the spec; the first tickets are the skeleton: the app that runs, its first test, its verification skill.
4. `/poteto-mode` builds the skeleton tickets one at a time with the Feature playbook. Once the app runs, [`/create-verification-skill`](../create-verification-skill/SKILL.md), then `/poteto-mode autopilot-stack <the rest of the queue>`.
5. [`/reflect`](../reflect/SKILL.md).

Trackers for every step follow [`../to-tickets/TRACKERS.md`](../to-tickets/TRACKERS.md). For a question about pstack itself rather than work, point to [`/poteto-help`](../poteto-help/SKILL.md).
