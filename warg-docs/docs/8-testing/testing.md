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
- **Standard Run:** `npm run test` executes all three projects (CI runs them as separate steps).
- **Coverage Run:** To generate a coverage report for the whole `src/` tree, run `npx cross-env NODE_ENV=test jest --coverage --runInBand` from `server/`. The `--runInBand` flag is critical because our integration tests share a local testing database; running them concurrently will cause database collisions and false failures (e.g., 401s during authentication tests).

### Frontend Testing (Client)

The frontend uses Playwright for end-to-end UI testing and is configured to capture native V8 JavaScript coverage to ensure edge cases and error states are genuinely tested.
- **Standard Run:** `npm run test:ui` executes the tests and automatically outputs a code coverage table to the console.
- **HTML Report:** Detailed line-by-line coverage is generated at `client/coverage-reports/index.html` via the `monocart-reporter`.

> [!WARNING]
> **Playwright & Dialogs:** When V8 coverage profiling is active, Chromium's CDP thread can deadlock if a native JS `alert()` blocks the page. **Always** attach dialog listeners *before* the action that triggers them (e.g., `page.once('dialog', ...)`) rather than awaiting them afterward to prevent 30-second timeouts.


### Continuous Integration (CI)

Our CI pipeline is configured using Gitea Actions (`.gitea/workflows/ci.yml`). Upon every push or pull request, the pipeline automatically:
- Installs dependencies
- Runs linting checks (ESLint) for the server and the client
- Executes the backend Jest projects — unit, mocked and integration — against a MySQL service container
- Runs the Playwright UI test suite for the client
- Reports the status to the version control system

If any step fails, the pipeline will halt, and the corresponding commit will be marked with a failure status.

## 3 Code Coverage and Performance

### 3.1 Code Coverage Metrics

A 60% minimum coverage is our internal development target, but it is **not** enforced by an automated gate — `server/jest.config.js` defines no `coverageThreshold`, so a build will not fail if coverage drops below it. The figures below come from the most recent full runs and can be reproduced with the commands in the sections above.

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
