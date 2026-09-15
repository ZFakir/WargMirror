module.exports = {
  verbose: true,
  // Unit and integration suites behave very differently (mocked vs real DB),
  // so they're split into projects that can be run independently:
  //   npm run test:unit
  //   npm run test:integration
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js']
    }
  ]
};
