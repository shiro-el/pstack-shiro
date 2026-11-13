### Idea to PRs

**You own the path from an unsettled idea to a queue Autopilot can run. You settle intent with the operator, and you do not build until the queue exists.**

Each stage ends on a state the next stage starts from. When a stage ends, name the state it reached, offer the next stage, and stop. The next stage often spends a lot, and the operator may want to stop there. Keep going without stopping only when the operator said to run to the end.

You run every stage's skill yourself by reading its SKILL.md at the linked path. The operator never types a skill command. Offer the next stage as a plain question the operator can answer with yes or no. Where a stage's skill ends by offering a slash command or printing one for the operator to run (`/to-tickets`, `/poteto-mode autopilot-stack ...`, `/to-spec`), this playbook's next stage replaces it.

1. Pick the path from the input and the repo, and say which in one line.
   - **Existing codebase.** An idea bigger than one PR, in a repo with running code and tests. Existing code gives trunk behavior to compare against and an app to drive, which verification needs.
   - **From scratch.** An idea in an empty repo, or one too foggy to settle in one chat.
   - **Issues with open decisions.** Existing issues, each about one PR in size, where some still hold an open product decision or have no "Blocked by" edges yet.
   - When the repo has code but the idea is foggy, ask once which of the first two paths fits.
   - **Resume.** The input is an artifact an earlier stage left. Start at the stage after it, on the path that produced it. A wayfinder map (label `wayfinder:map`, or `.scratch/<effort>/map.md`) resumes **wayfinder**, working the next frontier ticket. A spec (an issue from **to-spec**, or `.scratch/<slug>/spec.md`) goes to **to-tickets**. A ticket queue goes to Autopilot-stack.
2. Run the path's stages below in order.

#### Existing codebase

1. The **grilling** skill ([`../../grilling/SKILL.md`](../../grilling/SKILL.md)) settles the intent until every decision is the operator's. State: every decision settled.
2. A grilling question that only a run can answer, such as a state model, a layout, or a timing, goes to the Prototype playbook (`playbooks/prototype.md`). Its answer returns to the grilling.
3. The **to-spec** skill ([`../../to-spec/SKILL.md`](../../to-spec/SKILL.md)) runs in the same chat, before context clears, so the spec holds the settled decisions and the test seams that poteto-mode's **Spec-driven work** binds owners to. Skip it only when the work will cut into one or two tickets, and say so in one line. State: a spec.
4. The **to-tickets** skill ([`../../to-tickets/SKILL.md`](../../to-tickets/SKILL.md)) cuts the spec, or the grilling when the spec was skipped, in the same chat. State: a ticket queue with "Blocked by" edges.
5. Run the Autopilot-stack playbook (`playbooks/autopilot-stack.md`) on the queue, or Autopilot-full (`playbooks/autopilot-full.md`) when the operator said to merge. State: a verified stack for the operator to land.
6. The **reflect** skill ([`../../reflect/SKILL.md`](../../reflect/SKILL.md)) turns what went wrong into skill edits.

#### From scratch

1. The **wayfinder** skill ([`../../wayfinder/SKILL.md`](../../wayfinder/SKILL.md)) charts the destination and a map of decision tickets, then resolves one per session until the way is clear. State: a cleared map.
2. The **to-spec** skill ([`../../to-spec/SKILL.md`](../../to-spec/SKILL.md)) collapses the map's decisions into one spec. State: a spec.
3. The **to-tickets** skill cuts the spec. The first tickets are the skeleton: the app that runs, its first test, and its verification skill. State: a ticket queue whose first tickets are the skeleton.
4. Build the skeleton tickets one at a time with the Feature playbook (`playbooks/feature.md`). Once the app runs, run the **create-verification-skill** skill ([`../../create-verification-skill/SKILL.md`](../../create-verification-skill/SKILL.md)). State: a running app that agents can drive.
5. Run the Autopilot-stack playbook on the rest of the queue, or Autopilot-full when the operator said to merge.
6. The **reflect** skill.

#### Issues with open decisions

1. Read each issue's body and comments in full. Sort the issues into three groups: decided, open decision, and held out by the operator. Show the grouping in one table.
2. Run the **grilling** skill on the open-decision issues only. When a decision settles, add a `Decision:` line to its issue. State: no issue in the queue holds an open decision.
3. Write the "Blocked by" edges on the existing issues, per [`../../to-tickets/TRACKERS.md`](../../to-tickets/TRACKERS.md). Do not cut them again with **to-tickets**, because it publishes new sub-issues. Run **to-tickets** only on an issue too big for one PR. Leave the held-out issues out of the queue. State: a ticket queue with "Blocked by" edges.
4. Run the Autopilot-stack playbook on the queue, or Autopilot-full when the operator said to merge.
5. The **reflect** skill.

Trackers for every stage follow [`../../to-tickets/TRACKERS.md`](../../to-tickets/TRACKERS.md).

**Reply:** the path and the stage reached, the state that stage left (the decisions settled, the map, the spec, or the queue with its edges), and the next stage on offer.
