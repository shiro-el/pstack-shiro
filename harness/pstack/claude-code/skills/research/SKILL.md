---
name: research
description: Research a question outside the repo against primary sources, in a background agent, into a cited Markdown file. Use when the user says research, 조사, or 동향 파악, or wants docs, API facts, or the state of practice gathered.
---

# Research

Spin up a **background agent** to do the research, so you keep working while it reads. For how this codebase works or why it was built this way, use [`/how`](../how/SKILL.md) or [`/why`](../why/SKILL.md) instead; this skill reads outside the repo.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).
