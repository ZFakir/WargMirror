# Testing & Quality Assurance

This document outlines the testing strategy, policies, and formal user feedback processes for the WARG Platform. Our goal is to ensure platform stability, reliability, and continuous improvement through rigorous automated testing and structured user feedback.

## Policy Around Tests

1. **Test Coverage Requirements:** All new features must be accompanied by appropriate automated tests (unit, integration, or end-to-end).
2. **Pre-commit Hooks:** Code must pass linting and unit tests before being committed to the repository.
3. **Continuous Integration (CI):** All branches pushed to the remote repository will trigger our CI pipeline. Merging to the `main` branch is blocked unless all tests pass successfully.
4. **Bug Fixes:** Any bug fix must include a regression test to ensure the issue does not reappear in future releases.
5. **Review Process:** Code reviewers must verify that adequate tests are included and that they correctly assert the expected behavior.

## Automated Testing Procedure

Our automated testing suite strictly ensures the functionality of both the frontend (Playwright) and backend (Jest) components of the WARG Platform. We prioritize not just pass/fail rates, but robust code coverage metrics to guarantee system stability.

### Backend Testing (Server)

The backend uses Jest and is split into `unit`, `mocked`, and `integration` test projects. 
- **Standard Run:** `npm run test` executes all three projects.
- **Coverage Run:** To generate coverage, you **must** run `npx jest --coverage --runInBand`. The `--runInBand` flag is critical because our integration tests share a local testing database; running them concurrently will cause database collisions and false failures (e.g., 401s during authentication tests).

### Frontend Testing (Client)

The frontend uses Playwright for end-to-end UI testing and is configured to capture native V8 JavaScript coverage to ensure edge cases and error states are genuinely tested.
- **Standard Run:** `npm run test:ui` executes the tests and automatically outputs a code coverage table to the console.
- **HTML Report:** Detailed line-by-line coverage is generated at `client/coverage-reports/index.html` via the `monocart-reporter`.

> [!WARNING]
> **Playwright & Dialogs:** When V8 coverage profiling is active, Chromium's CDP thread can deadlock if a native JS `alert()` blocks the page. **Always** attach dialog listeners *before* the action that triggers them (e.g., `page.once('dialog', ...)`) rather than awaiting them afterward to prevent 30-second timeouts.


### Continuous Integration (CI)

Our CI pipeline is configured using Gitea Actions (or GitHub Actions). Upon every push or pull request, the pipeline automatically:
- Installs dependencies
- Runs linting checks
- Executes the automated test suite
- Reports the status to the version control system

If any step fails, the pipeline will halt, and the corresponding commit will be marked with a failure status.

## 3 Code Coverage and Performance

### 3.1 Code Coverage Metrics
To maintain code quality and satisfy our internal development standards (Sprint 3 Advanced), we strictly enforce a minimum code coverage threshold of **60%** across the entire codebase.
- **Server:** Our Jest test suite (unit + integration) achieves **~69%** statement coverage.
- **Client:** Our Playwright E2E test suite effectively covers all user flows, resulting in 72 passing test cases and ensuring the UI is well-tested.

### 3.2 Performance Testing
We verify performance using Google Lighthouse audits. The WARG Platform frontend has been optimized to ensure there are **no performance issues**:
- **Lighthouse Performance Score:** > 90%
- We utilize efficient query indexing on the backend to maintain API response times below 200ms on average.

## 4 User Feedback Formal Process

Gathering and acting upon user feedback is a critical part of our quality assurance strategy.

### Feedback Collection
- **In-App Feedback:** Users can submit feedback directly through the WARG Platform using the "Feedback" button.
- **Surveys:** Periodic surveys are sent to active users to gauge satisfaction and gather feature requests.
- **Support Channels:** Feedback is also collected via our official support email and community forums.

### Triage and Prioritization
1. **Initial Review:** The product team reviews incoming feedback weekly.
2. **Categorization:** Feedback is categorized into Bugs, Feature Requests, or Usability Enhancements.
3. **Prioritization:** Items are prioritized based on impact, frequency, and alignment with the product roadmap.

### Action and Follow-up
- **Issue Creation:** Validated feedback is converted into actionable issues in our project management tool.
- **Resolution:** Once an issue is resolved, it undergoes the standard automated testing procedure.
- **Communication:** Users who provided the feedback are notified of the resolution in the subsequent release notes or via direct communication.
