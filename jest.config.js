module.exports = {
  preset: '@react-native/jest-preset',
  // Steer react-native-worklets imports to the JS (non-native) module so the
  // worklets TurboModule proxy isn't required under Jest (Reanimated 4).
  resolver: 'react-native-worklets/jest/resolver.js',
  // Narrower than the default `**/__tests__/**/*` — require the `.test.`
  // suffix so shared test-only helper modules (e.g. a `harness.tsx` a suite
  // imports from) can live alongside spec files in `__tests__/` without
  // Jest treating them as suites of their own. Matches every existing spec
  // file already (all named `*.test.{ts,tsx}`), so this is a no-op for
  // current discovery.
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  setupFiles: [
    '<rootDir>/jest.setup.js',
    '@shopify/react-native-skia/jestSetup.js',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/_*',
  ],
  coverageThreshold: {
    './src/core/': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-linear-gradient|@react-navigation|react-native-screens|react-native-safe-area-context|@shopify/react-native-skia|react-native-reanimated|react-native-worklets|react-native-gesture-handler)/)',
  ],
};
