# Testing & Quality Assurance

This document outlines the testing strategy, policies, and formal user feedback processes for the WARG Platform. Our goal is to ensure platform stability, reliability, and continuous improvement through rigorous automated testing and structured user feedback.

## Policy Around Tests

1. **Test Coverage Requirements:** All new features must be accompanied by appropriate automated tests (unit, integration, or end-to-end).
2. **Pre-commit Hooks:** Code must pass linting and unit tests before being committed to the repository.
3. **Continuous Integration (CI):** All branches pushed to the remote repository will trigger our CI pipeline. Merging to the `main` branch is blocked unless all tests pass successfully.
4. **Bug Fixes:** Any bug fix must include a regression test to ensure the issue does not reappear in future releases.
5. **Review Process:** Code reviewers must verify that adequate tests are included and that they correctly assert the expected behavior.

## Automated Testing Procedure

Our automated testing suite ensures the functionality of both the frontend and backend components of the WARG Platform.

### Running Tests Locally

To run the test suite locally, navigate to the respective directory (`client` or `server`) and execute the following command:

```bash
# Run backend tests
cd server
npm run test

# Run frontend tests
cd ../client
npm run test
```

### Continuous Integration (CI)

Our CI pipeline is configured using Gitea Actions (or GitHub Actions). Upon every push or pull request, the pipeline automatically:
- Installs dependencies
- Runs linting checks
- Executes the automated test suite
- Reports the status to the version control system

If any step fails, the pipeline will halt, and the corresponding commit will be marked with a failure status.

## User Feedback Formal Process

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
