---
sidebar_position: 2
---

# Stakeholder Meetings

Log of check-ins with our assigned tutor (client). Per the Methodology, we meet with our tutor weekly; entries are added after each meeting going forward.

---

## 2026-08-19 — Initial Tutor Check-in

**Attendees:** Full team, tutor

**Format:** Informal — no minutes taken live; this entry reconstructed shortly after from team recollection.

**Discussed:**
- Walked the tutor through our current direction: project scope, tech stack, and progress so far (auth, core data model, initial client pages)
- Talked through our internal process — twice-weekly check-ins, GitHub Projects board, group-agreed task assignment, peer review before merge
- Established a standing weekly meeting going forward

**Feedback / Decisions:**
- Tutor agreed with our current implementation choices and team policies as presented — no changes requested at this stage
- No open concerns raised

**Action items:** None outstanding.

---

## 2026-08-26 — Sprint 1 Review & Planning

**Attendees:** Full team, tutor

**Discussed:**
- Demonstrated the initial map rendering and basic user registration flow.
- Discussed the schema for Waypoints and Arg instances.

**Feedback / Decisions:**
- Tutor suggested adding buffer coordinates to the waypoint interaction for future anti-spoofing logic.
- We agreed to prioritize the core ARG node placement before social features.

**Action items:**
- Implement anti-spoofing basic framework.
- Finalize the core database schema.

---

## 2026-09-02 — Mid-Sprint 2 Check-in

**Attendees:** Full team, tutor

**Discussed:**
- Showcased the new PlayModal and basic minigame integration.
- Discussed integration issues with the AI Engine microservice.

**Feedback / Decisions:**
- AI Engine should be separated via HTTP requests (FastAPI) instead of direct imports to maintain loose coupling.
- Tutor approved the UI mockups for the feedback mechanism.

**Action items:**
- Fix CI pipeline which was broken due to testing timeouts.

---

## 2026-09-09 — Sprint 2 Review & Advanced Testing Strategy

**Attendees:** Full team, tutor

**Discussed:**
- Demonstrated the fully working AI backend and camera UI.
- Discussed testing coverage and the need to reach >60%.

**Feedback / Decisions:**
- Tutor stressed the importance of extensive user testing for the final Sprint 3 rubric.
- We agreed to organize a formal playtesting session with classmates.

**Action items:**
- Set up Playwright for E2E testing to increase coverage.
- Organize user playtesting.

---

## 2026-09-16 — Sprint 3 Planning & Playtest Results

**Attendees:** Full team, tutor

**Discussed:**
- Reviewed feedback from the initial user testing session (UI overlaps, MapModal scrolling issues).
- Discussed polishing the mobile UI based on the feedback.

**Feedback / Decisions:**
- Tutor confirmed the playtesting documentation looks good and meets the requirement.
- Agreed to prioritize the mobile UI polish (flexbox, z-index fixes) before final submission.

**Action items:**
- Implement mobile UI fixes based on user feedback.

---

## 2026-09-23 — Sprint 3 Final Review (Pre-submission)

**Attendees:** Full team, tutor

**Discussed:**
- Final walkthrough of the app on mobile simulators.
- Confirmed that anti-spoofing speed and teleportation blocks are active.
- Reviewed final coverage reports (>60% achieved).

**Feedback / Decisions:**
- Tutor is satisfied with the progress. No major structural changes needed.
- Confirmed all features match the "Advanced" tier of the rubric.

**Action items:**
- Finalize documentation in `warg-docs/`.
- Ensure all CI checks are green before the final merge.

---

```markdown
## YYYY-MM-DD — [Short topic/title]

**Attendees:**

**Discussed:**
-

**Feedback / Decisions:**
-

**Action items:**
-
```
