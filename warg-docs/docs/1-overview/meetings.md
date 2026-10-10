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
- **Tutor Advice:** The tutor pointed out that GPS spoofing is a common issue in ARG games and strongly advised adding buffer coordinates and basic anti-spoofing logic before we get too deep into development.
- We agreed to prioritize connecting the template data on profiles and friends pages to the real database in the next sprint.

**Action items:**
- Implement anti-spoofing basic framework (per tutor request).
- Finalize the core database schema for social features (friends, badges).

---

## 2026-09-02 — Mid-Sprint 2 Check-in

**Attendees:** Full team, tutor

**Discussed:**
- **Follow-up:** Showcased the initial anti-spoofing framework and buffer coordinates implementation exactly as requested by the tutor last week.
- Demonstrated the newly implemented social features: recursive commenting, flagging, and liking/disliking ARGs.
- Showcased dynamic population of the Friends page and Badges from the database.

**Feedback / Decisions:**
- Tutor approved the UI for the feedback mechanism (comments/flags).
- **Tutor Advice:** The tutor noted that our documentation was feeling a bit scattered and advised us to adopt a centralized documentation system (like Docusaurus) to explicitly outline our Git policies, workflows, and API references.

**Action items:**
- Migrate to Docusaurus and expand documentation (per tutor request).
- Begin integrating the AI Engine for minigame computer vision.

---

## 2026-09-09 — Sprint 2 Review & Advanced Testing Strategy

**Attendees:** Full team, tutor

**Discussed:**
- **Follow-up:** Presented the newly launched Docusaurus documentation site, specifically highlighting the Git policies and development process pages added based on the tutor's advice from the previous meeting.
- Demonstrated the modular MapModal component and the reworked Warg editor interface for authoring.
- Showcased the working AI backend (FastAPI proxy) for SAM extraction and HSV matching.
- Discussed testing coverage and the need to reach >60%.

**Feedback / Decisions:**
- **Tutor Advice:** While the features look great, the tutor stressed that to hit the "Advanced" rubric criteria, we must conduct and document extensive, formal user playtesting with people outside the team.
- We agreed to organize a formal playtesting session with classmates to test the new map and AI features.

**Action items:**
- Set up Playwright for E2E testing to increase coverage.
- Organize user playtesting (per tutor request).

---

## 2026-09-16 — Sprint 3 Planning & Playtest Results

**Attendees:** Full team, tutor

**Discussed:**
- **Follow-up:** Presented the results of the formal user playtesting session, which was organized directly in response to the tutor's strong recommendation last week.
- Reviewed feedback from the playtesting (Feedback UI overlaps, MapModal scrolling issues, HUD blocking waypoint info).
- Confirmed that the remaining AI endpoints (SIFT, Symmetry, Texture) are fully functional.

**Feedback / Decisions:**
- Tutor confirmed the playtesting documentation looks excellent and meets the rubric requirement perfectly.
- **Tutor Advice:** The tutor advised us to immediately prioritize fixing the mobile UI overlaps identified in the playtesting before focusing on any new features.

**Action items:**
- Implement mobile UI fixes based on user feedback (per tutor request).

---

## 2026-09-23 — Sprint 3 Final Review (Pre-submission)

**Attendees:** Full team, tutor

**Discussed:**
- **Follow-up:** Demonstrated the mobile UI improvements (flexbox, z-index fixes) that were implemented directly as a result of the playtesting action item set by the tutor last week.
- Confirmed that the full anti-spoofing system (speed limits, teleportation blocks) is active.
- Reviewed the latest test coverage reports and acknowledged the remaining gaps against the 60% coverage target.

**Feedback / Decisions:**
- Tutor is highly satisfied with how responsive the team has been to feedback throughout the sprints.
- Confirmed all features, documentation, and processes match the "Advanced" tier of the rubric.

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
