---
sidebar_position: 1
---

# AI Usage Attribution

This page records how generative AI tools were used during the development of the WARG Platform, in line with the course requirement to disclose AI assistance.

## Scope

AI tools were used extensively within this project. Code was produced largely by agentic coding tools. Documentation was partially produced and reviewed by agentic tools. Code-reviews and pull requests were evaluated both manually and using AI. Design philsophy and layouts were manually outlined and implemented using agents.

## Tools Used

| Tool | Where used | Purpose | Reviewed by |
|---|---|---|---|
| Gemini 3.1 Pro | UI, Testing, Navigation, CRUD processes | Producing test cases, implementing UI wireframes, connecting front end to back end services | Zaeem Fakir |

_Add one row per tool per contributing team member. Remove the examples once real entries are added._

## How AI Output Was Reviewed

1. Every AI-assisted change was reviewed by at least one other team member through the normal pull-request process before merging.
2. All merges had to pass the automated suites: the backend Jest projects (`npm run test` in `server/`) and the Playwright UI tests (`npm run test:ui` in `client/`).
3. ESLint (`npm run lint` in `server/` and `client/`) enforces the project code style regardless of how a change was produced.
4. Suggestions that could not be verified against the running system (behavioural claims, performance numbers, security assumptions) were reproduced manually before being accepted.

## Declaration

_Each team member should complete the table above with the tools relevant to their work. This page is a living document and should be updated whenever a new tool is adopted._
