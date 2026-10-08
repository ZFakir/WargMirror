module.exports = {
  verbose: true,
  // Unit and integration suites behave very differently (mocked vs real DB),
  // so they're split into projects that can be run independently:
  //   npm run test:unit
  //   npm run test:integration
  projects: [
    {
      // Mocked model/controller/route/config tests: no DB, so no globalSetup.
      displayName: 'mocked',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
      // Note: brace globs ("{a,b}") break under jest-on-Windows path handling,
      // so the four dirs are listed explicitly.
      testMatch: [
        '<rootDir>/tests/models/**/*.test.js',
        '<rootDir>/tests/controllers/**/*.test.js',
        '<rootDir>/tests/routes/**/*.test.js',
        '<rootDir>/tests/config/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        'tests/controllers/argController.test.js',
        'tests/controllers/userController.test.js',
        'tests/routes/authRoutes.test.js'
      ]
    },
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
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js']
    }
  ]
};
