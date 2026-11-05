# Trackers

Where `/to-spec`, `/to-tickets`, and `/wayfinder` publish. Find the repo's tracker in the `Issue tracker` section of its `AGENTS.md` or `CLAUDE.md` and the doc it points to (usually `docs/agents/issue-tracker.md`). That doc wins wherever it differs from this file. A repo that names no tracker uses **Local files**; say so in the report.

## Local files

Everything lives under `.scratch/<feature-slug>/`, created when the first file is written.

- **Spec**: `.scratch/<feature-slug>/spec.md`.
- **Ticket**: one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, never one combined file.
- **Blocked by**: a `**Blocked by:**` line near the top listing ticket numbers and titles. A ticket is unblocked when every ticket it lists is done.
- **Status**: a `**Status:**` line near the top, using the repo's triage roles when its `AGENTS.md` defines them, else `ready-for-agent`.
- **Comments**: append under a `## Comments` heading at the bottom.

## GitHub issues

`gh` for everything. `<repo>` is `gh repo view --json nameWithOwner --jq .nameWithOwner`.

- **Create**: `gh issue create --title "..." --body-file - [--label ...]` with a heredoc body. When the repo has `.github/ISSUE_TEMPLATE/`, keep the matching template's headings and apply its type label yourself, since `--body-file` skips the template.
- **Read**: `gh issue view <n> --json number,title,body,labels,state,comments`.
- **Sub-issue**: `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`, with the database id from `gh api repos/<repo>/issues/<child> --jq .id`.
- **Blocked by**: a `## Blocked by` section listing `#N`. Also add the native edge where the repo uses it: `gh api --method POST repos/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` (database id, not the `#number`). `gh api repos/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` counts open blockers.
- **Labels**: `gh issue edit <n> --add-label "..."`. A label that does not exist yet is created with `gh label create`.
- **Comment, close**: `gh issue comment <n> --body "..."`, `gh issue close <n> --comment "<reason>"`.

GitHub shares one number space across issues and PRs, so resolve a bare `#42` with `gh issue view 42`, then `gh pr view 42`.

## Wayfinding operations

Used by `/wayfinder`.

**Local files.** The map is `.scratch/<effort>/map.md` (the map body). Each ticket is `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body, a `Type:` line (`research`/`prototype`/`grilling`/`task`), a `Status:` line (`claimed`/`resolved`), and a `Blocked by: NN, NN` line. The frontier is the files that are open, unblocked, and unclaimed; first by number wins. Claim by setting `Status: claimed` and saving before any work. Resolve by appending the answer under `## Answer`, setting `Status: resolved`, then appending a context pointer (gist + link) to the map's Decisions-so-far.

**GitHub issues.** The map is one issue labelled `wayfinder:map`. Each ticket is a sub-issue of the map labelled `wayfinder:<type>`, with native blocking edges. The frontier is the map's sub-issues (`gh api repos/<repo>/issues/<map>/sub_issues`) that are open, unassigned, and have no open blocker; first in map order wins. Claim with `gh issue edit <n> --add-assignee @me`, the session's first write. Resolve with `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
