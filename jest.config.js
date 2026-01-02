export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@forcecalendar/core)/'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true
};