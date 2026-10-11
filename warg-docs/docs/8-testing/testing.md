# Testing & Quality Assurance

This document outlines the testing strategy, policies, and formal user feedback processes for the WARG Platform. Our goal is to ensure platform stability, reliability, and continuous improvement through rigorous automated testing and structured user feedback.

## Policy Around Tests

1. **Test Coverage Requirements:** All new features must be accompanied by appropriate automated tests (unit, integration, or end-to-end).
2. **Continuous Integration (CI):** All branches pushed to the remote repository will trigger our CI pipeline. Merging to the `main` branch is blocked unless all tests pass successfully.
3. **Bug Fixes:** Any bug fix must include a regression test to ensure the issue does not reappear in future releases.
4. **Review Process:** Code reviewers must verify that adequate tests are included and that they correctly assert the expected behavior.

## Automated Testing Procedure

Our automated testing suite strictly ensures the functionality of both the frontend (Playwright) and backend (Jest) components of the WARG Platform. We prioritize not just pass/fail rates, but robust code coverage metrics to guarantee system stability.

### Backend Testing (Server)

The backend uses Jest and is split into `unit`, `mocked`, and `integration` test projects.
- **Standard Run:** `npm run test` executes all three projects.
- **Coverage Gate:** `npm run test:coverage` executes all three projects serially, collects coverage for the whole `src/` tree, and enforces minimum global coverage of 85% statements and 70% branches. CI runs this command only against its isolated `warg_test` MySQL service. Do not run it against any shared or production database.

### Frontend Testing (Client)

The frontend uses Playwright for end-to-end UI testing.
- **Standard Run:** `npm run test:ui` executes the tests without V8 profiling so local correctness runs remain fast and stable.
- **Coverage Run:** `npm run test:ui:coverage` enables the monocart V8 report at `client/coverage-reports/index.html`. CI uses this command. A numeric client coverage threshold has not yet been added; it will be set only after the remaining placeholder specifications are replaced with behavioural tests.


### Continuous Integration (CI)

Our CI pipeline is configured using Gitea Actions (`.gitea/workflows/ci.yml`). Upon every push or pull request, the pipeline automatically:
- Installs dependencies
- Runs linting checks (ESLint) for the server and the client
- Executes the backend Jest projects — unit, mocked and integration — against an isolated MySQL service container, with the server coverage gate enabled
- Runs the Playwright UI test suite for the client with coverage reporting enabled
- Reports the status to the version control system

If any step fails, the pipeline will halt, and the corresponding commit will be marked with a failure status.

## 3 Code Coverage and Performance

### 3.1 Code Coverage Metrics

The server coverage gate is enforced at 85% statements and 70% branches. The client report is collected in CI but has no numeric threshold yet, because the remaining placeholder specifications would make a ratchet unreliable. The figures below come from the most recent full runs and can be reproduced with the commands in the sections above.

- **Server:** The Jest projects (mocked + unit + integration, run together with `npx cross-env NODE_ENV=test jest --coverage --runInBand`) pass all **333 tests across 48 suites** and cover **90.55% of statements and 78.52% of branches** across every file in `server/src/` (coverage is collected from the whole tree via `collectCoverageFrom`, not only the files a test happened to import). The HTML report is written to `server/coverage/lcov-report/index.html`.
- **Client:** The Playwright UI suite covers the main user flows with **66 test cases across 22 spec files**; the `chromium` project passes all of them in the latest full run. The V8 coverage report produced by the run (`client/coverage-reports/index.html`) measures **32.97% of statements and 20.18% of branches** over the client-side scripts — the clearest remaining testing gap.

### 3.2 Performance Testing

No formal performance audit (such as a Google Lighthouse report) is committed to this repository, so this document makes no performance-score or API-latency claims. The performance-sensitive behaviour that we do verify automatically is limited to:

- Service-worker caching strategies (network-first, stale-while-revalidate, cache-first), exercised by `client/tests/caching.spec.js`.
- Offline play and background-sync recovery, exercised by `client/tests/offline.spec.js`.

## 4 User Feedback Formal Process

Gathering and acting upon user feedback is a critical part of our quality assurance strategy.

### Feedback Collection
- **In-App Feedback:** Users can submit feedback directly through the WARG Platform using the "Feedback" button.
- **User Testing Sessions:** Structured in-person playtesting sessions, as documented in [User Testing & Feedback](user-testing.md).

### Triage and Prioritization
1. **Initial Review:** The product team reviews incoming feedback weekly.
2. **Categorization:** Feedback is categorized into Bugs, Feature Requests, or Usability Enhancements.
3. **Prioritization:** Items are prioritized based on impact, frequency, and alignment with the product roadmap.

### Action and Follow-up
- **Issue Creation:** Validated feedback is converted into actionable issues in our project management tool.
- **Resolution:** Once an issue is resolved, it undergoes the standard automated testing procedure.
- **Communication:** Improvements driven by user feedback are recorded in the team's meeting minutes and reflected in subsequent work.
