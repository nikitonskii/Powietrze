module.exports = {
  preset: '@react-native/jest-preset',
  collectCoverageFrom: ['src/core/**/*.ts', '!src/core/**/index.ts', '!src/core/**/types.ts'],
  coverageThreshold: {
    './src/core/': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
