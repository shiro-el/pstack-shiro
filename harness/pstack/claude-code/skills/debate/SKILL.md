---
name: debate
description: "Debaters with assigned stances argue a motion over rounds, rebut each other with evidence, and a judge from another model family rules. Use for /debate, 'debate this', 'argue both sides', or a decision where one attempt would hide the strongest objection."
disable-model-invocation: true
---

# Debate

In Claude Code, read [the Claude Code adapter](../../docs/harness/claude-code.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to Claude Code.

In Claude Code, read [the Claude Code adapter](../../docs/harness/claude-code.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to Claude Code.

A debate settles a decision by making positions collide. Each debater defends an assigned stance, reads its opponents' latest positions every round, and answers them with evidence. A judge from another family rules on the transcript. Where `/arena` merges parallel attempts at one artifact, a debate keeps the disagreement and reports which arguments survived it.

Open a todolist with one entry per phase (Frame, Opening, Rounds, Judge, Synthesis) before launching anything.

## Frame

1. Write the **motion**: one decidable sentence ("Replace X with Y in Z"), or an open question ("How should Z prevent W?"). A motion two debaters could both accept as worded is too vague; sharpen it first.
2. Derive the rubric: 3-6 gradeable criteria for a good decision on *this* motion. The judge scores with it. Debaters see the motion and their stance, never the rubric.
3. **Assign stances.** Free choice converges on the first plausible answer, so every debater starts from a stance you give it:
   - A decidable motion gets `pro` and `con`, plus a `devil's advocate` that attacks whichever side leads after each round when there are three or more debaters.
   - An open question gets one **lens** per debater, such as minimal change, maximal safety, reuse what exists, and attack the premise. Pick lenses that pull in different directions for this motion.
   - Cross the families over the stances, so no stance is held only by one family.
4. Pick the debaters from the `debate panel` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, read `arena runners` the same way arena Phase A step 3 does, including its family and fallback rules. One debater runs per stance; add seats on the panel's models until every stance has one.
5. Choose the **evidence bar**. A motion about code defaults to run proof: a debater backs a factual claim with a command, a prototype, or a file and line in the real tree, and a claim it did not back counts as opinion. A motion about product or wording may accept cited sources instead. Write the bar into the brief.
6. Set the rounds (default 2, at most 4) and a word limit per position (default 600).
7. Write the shared grounding (the motion, the facts every side needs, the evidence bar, the limits) to `/tmp/debate-<slug>/GROUNDING.md`. Give each debater its own directory `/tmp/debate-<slug>/<stance>/`, and its own worktree when its evidence needs code changes, per the **separate-before-serializing-shared-state** principle skill.

More than three debaters, or several motions at once, go to one coordinator that runs the debates and returns each synthesis. Run independent motions as separate debates, never as one panel.

## Opening

Spawn every debater in one message with `run_in_background: true`. Each brief names the grounding file, the debater's stance, its directory, and these rules:

> Defend your assigned stance as strongly as the evidence allows. Write `opening.md` in your directory: your position, the three strongest arguments for it with their evidence, and the strongest objection you expect and your answer to it. Stay within the word limit. In later rounds you will receive your opponents' latest files. You may concede a point only when an opponent's evidence beats yours; log every concession in `changes.md` with the evidence that forced it.

A debater that writes nothing drops out; continue when two stances remain and note the dropout.

## Rounds

Each round, send every debater the paths of its opponents' latest files and this instruction:

> Read your opponents' latest positions. For each of their arguments, concede it, contest it with new evidence, or refine your own position around it. Write `round-<n>.md`: your revised position, then each argument you answered and how. Log concessions and changes in `changes.md`. A rebuttal without evidence counts as a restatement.

Keep the debaters alive between rounds and steer them with the next round's message, so each keeps its own reasoning. When the harness cannot resume an agent, spawn a fresh one on the same model with its own earlier files and the opponents' latest files.

Wait for every debater before you start the next round. Stop early when a round brings no new concession and no new evidence: the positions have converged or deadlocked, and another round only repeats them.

## Judge

Choose one judge from the `debate judge pool` line, else `arena cross-judge pool`, with arena Phase C's family rule: never the parent's family, and the judge skips when no other family runs. Spawn it readonly. Give it the rubric, the grounding, and every debater's files under blind labels (`A`, `B`, `C`), with the stance names removed. The judge:

- scores each criterion per debater;
- names the arguments that survived rebuttal and the ones that fell, citing the round;
- checks each concession in `changes.md`, and marks down a debater that conceded without the opponent's evidence or held a point after its evidence was refuted;
- rules on the motion, or says the transcript leaves it open and which fact would settle it.

## Synthesis

Read every debater's files end to end, then the verdict. Rerun the run-proof claims the verdict relies on, per the **prove-it-works** principle skill; an argument whose evidence does not reproduce falls, whichever side it helped. Where you and the judge disagree, read both rationales and say which you follow and why.

When the judge skipped, rule yourself and say so.

## Output

- **Motion** and the stance each label held.
- **Decision**: the ruling, or "open", with the fact that would settle it.
- **Surviving arguments**: each with its evidence and the reruns you did.
- **Dissent**: the strongest argument on the losing side, and when it would change the decision.
- **Concessions**: who moved, in which round, and on what evidence.
- **Verdict**: the judge's scores, its model, or that the judge skipped.
- **Dropouts** and early stops.
