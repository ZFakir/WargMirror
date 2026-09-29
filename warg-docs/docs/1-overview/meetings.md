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
- Demonstrated the initial map rendering, user registration flow, and basic ARG placement.
- Showcased the initial Creator Studio, including the ARG editor and basic analytics page.
- Discussed the Admin Dashboard and profile/friend pages.

**Feedback / Decisions:**
- Tutor suggested adding buffer coordinates to the waypoint interaction for future anti-spoofing logic.
- We agreed to prioritize connecting the template data on profiles and friends pages to the real database in the next sprint.

**Action items:**
- Implement anti-spoofing basic framework.
- Finalize the core database schema for social features (friends, badges).

---

## 2026-09-02 — Mid-Sprint 2 Check-in

**Attendees:** Full team, tutor

**Discussed:**
- Demonstrated the newly implemented social features: recursive commenting, flagging, and liking/disliking ARGs.
- Showcased dynamic population of the Friends page and Badges from the database.
- Discussed the integration of the Docusaurus site for project documentation.

**Feedback / Decisions:**
- Tutor approved the UI for the feedback mechanism (comments/flags).
- Agreed that the documentation should be expanded to include detailed Git policies and development processes.

**Action items:**
- Expand Docusaurus documentation.
- Begin integrating the AI Engine for minigame computer vision.

---

## 2026-09-09 — Sprint 2 Review & Advanced Testing Strategy

**Attendees:** Full team, tutor

**Discussed:**
- Demonstrated the modular MapModal component and the reworked Warg editor interface for authoring.
- Showcased the working AI backend (FastAPI proxy) for SAM extraction and HSV matching.
- Discussed testing coverage and the need to reach >60%.

**Feedback / Decisions:**
- Tutor stressed the importance of extensive user testing for the final Sprint 3 rubric.
- We agreed to organize a formal playtesting session with classmates to test the new map and AI features.

**Action items:**
- Set up Playwright for E2E testing to increase coverage.
- Organize user playtesting.

---

## 2026-09-16 — Sprint 3 Planning & Playtest Results

**Attendees:** Full team, tutor

**Discussed:**
- Reviewed feedback from the initial user testing session (Feedback UI overlaps, MapModal scrolling issues, HUD blocking waypoint info).
- Discussed polishing the mobile UI based on the feedback.
- Confirmed that the remaining AI endpoints (SIFT, Symmetry, Texture) are fully functional.

**Feedback / Decisions:**
- Tutor confirmed the playtesting documentation looks good and meets the requirement.
- Agreed to prioritize the mobile UI polish (flexbox, z-index fixes) before final submission.

**Action items:**
- Implement mobile UI fixes based on user feedback.

---

## 2026-09-23 — Sprint 3 Final Review (Pre-submission)

**Attendees:** Full team, tutor

**Discussed:**
- Final walkthrough of the app on mobile simulators, highlighting the fixed UI overlaps and responsive design.
- Confirmed that anti-spoofing speed and teleportation blocks are active.
- Reviewed final coverage reports (>60% achieved) and Lighthouse performance scores.

**Feedback / Decisions:**
- Tutor is satisfied with the progress and the breadth of features implemented (Creator Studio, Social, AI, Admin).
- Confirmed all features match the "Advanced" tier of the rubric.

**Action items:**
- Finalize documentation in `warg-docs/` (AI Engine endpoints, Rubric gap analysis).
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
