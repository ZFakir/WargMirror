---
sidebar_position: 2
---

# User Testing & Feedback

To satisfy the requirements of Sprint 3 and ensure the WARG Platform is intuitive, we conducted structured user playtesting sessions. This document outlines the methodology, raw feedback, and actions taken to improve the product.

## Methodology

We conducted an in-person playtesting session on **2026-09-14** with 5 users (university students not involved in the project development). 
The users were given a link to the staging environment and asked to:
1. Register and log in.
2. Complete a single ARG node interaction (including walking to the waypoint and taking a photo).
3. Leave a comment.
4. Fill out a short qualitative feedback form at the end.

## Key Findings & Raw Feedback

### Positive
- **Concept:** All users loved the concept of an ARG platform and the smooth integration of the map.
- **Camera integration:** 4/5 users found the AI camera feedback fast and engaging.

### Constructive & Bug Reports
- **Feedback UI Overlap:** "When I open the feedback log, I can't minimize it again and it overlaps with the comments."
- **Feedback UI Stuck:** "The feedback box takes up the whole screen and I can't read the map anymore."
- **Waypoint HUD:** "The campus node network sign hides information about the waypoint when on mobile."

## Actions Taken

Based on this direct user feedback, the following issues were prioritized and resolved in Sprint 3:

1. **Feedback UI Fixes:** We implemented a flexbox layout for the `MapModal` and added a drop-down minimize/maximize arrow to the feedback section. The field log can now be collapsed easily, revealing the comments.
2. **HUD Adjustments:** We moved the Campus Node Network HUD to the top-left to stop it from obstructing the waypoint information.
3. **Z-Index Bugs:** We fixed z-index stacking issues that were causing UI elements to overlap inappropriately on mobile viewports.

*All user feedback has been directly incorporated into the `main` branch codebase prior to the Sprint 3 release.*
