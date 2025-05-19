const nextJest = require('next/jest.js')

// Provide the path to your Next.js app to load next.config.js and .env files in your test environment
const createJestConfig = nextJest({
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Module name mapper for path aliases
  // Make sure these match your tsconfig.json "paths"
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1', //
    '^@/actions/(.*)$': '<rootDir>/src/actions/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    // Add any other aliases you use
  },

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in.
  // Adjust if your tests or src are elsewhere. For Next.js with `src` directory:
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  // If not using `src` directory:
  // roots: ["<rootDir>/app", "<rootDir>/components", "<rootDir>/lib", "<rootDir>/actions", "<rootDir>/__tests__"],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).+(ts|tsx|js|jsx)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
