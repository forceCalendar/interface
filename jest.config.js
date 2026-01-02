export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@forcecalendar/core$': '<rootDir>/../core/core/index.js'
  },
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true
};