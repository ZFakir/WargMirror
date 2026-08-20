# Project Methodology

**Luc and Friends — WARG Platform**

This document describes how our team actually plans, assigns, and tracks work over the course of the project. It complements [`WARG_GIT_Policy.pdf`](./MiscellaneousDocumentation/WARG_GIT_Policy.pdf), which covers our *version control* conventions specifically; this document covers our day-to-day *development process*.

## Overview

We do not follow a formal named methodology (e.g. strict Scrum). Instead we run a lightweight, meeting-driven process built around regular check-ins, group-agreed task assignment, and mandatory review before anything is considered done. We chose this over a heavier framework because our team is small and our sprint boundaries are already fixed by the course's milestone schedule — a full Scrum overhead (formal ceremonies, story points, velocity tracking) would add process cost without adding much value at our scale.

## Meetings

We check in twice a week on a fixed schedule, supplemented by ad-hoc meetings when something time-sensitive comes up (a blocker, a decision that can't wait, or unplanned stakeholder feedback from our tutor).

Each fixed check-in covers:
- **What's been done** since the last check-in
- **What's planned** before the next one
- **Overall vision / direction** — making sure individual work is still tracking toward the milestone goals, and surfacing any scope or design concerns early

Notes from these meetings (decisions made, action items, stakeholder feedback) are logged in [`MEETINGS.md`](./MEETINGS.md).

## Task Assignment

Work is not assigned top-down by a single lead. Tasks are discussed and agreed on together during check-ins — the group looks at what's outstanding on the board, talks through priority and dependencies, and members take on tasks that fit their current workload and the skills needed. This keeps assignment adaptive: if someone is blocked or a task turns out bigger than expected, it gets re-discussed at the next check-in rather than being locked in by one person's initial estimate.

## Task Tracking

All tasks are tracked on a **GitHub Projects** board, organised by status (e.g. Backlog → In Progress → In Review → Done). The board is the single source of truth for what's outstanding and who's working on what, and is referenced directly in check-ins rather than relying on memory.

## Definition of Done

A feature is not considered complete when the person who built it says so. Before a task moves to "Done":
1. The work is opened as a PR against `main` (per our [Git Policy](./MiscellaneousDocumentation/WARG_GIT_Policy.pdf))
2. A different team member reviews and/or tests it — checking that it does what it claims to do, not just that it compiles
3. Any issues raised in review are addressed before merge

This mirrors the merge requirements in our Git Policy (peer review, automated checks, deployment verification) and ensures no single person's judgement is the only gate on quality.

## Why This Process

- **Twice-weekly fixed check-ins** keep the group aligned often enough to catch drift early, without the overhead of daily standups for a team our size.
- **Group-agreed assignment** avoids bottlenecking decisions on one person and keeps everyone aware of the full scope, not just their own slice.
- **Mandatory second-person review** is our main quality gate given we don't have extensive automated test coverage yet — it substitutes human review for the confidence that automated testing would otherwise provide, and is required before anything reaches `main`.
