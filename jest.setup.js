jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

// Official jest mock: also swaps SafeAreaProvider for a version that
// renders children synchronously via context (the real SafeAreaProvider
// defers children until a native onLayout event, which never fires under
// Jest — App.test.tsx / AppNavigator.test.tsx would otherwise render only
// an empty <RNCSafeAreaProvider />). The package only exposes this as a
// default export, so it's spread onto the module's named exports here —
// @react-navigation/bottom-tabs imports SafeAreaInsetsContext by name.
jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...require('react-native-safe-area-context/jest/mock').default,
}));

// Reanimated 4 test mock — worklets become no-ops under Jest.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
