import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

// Native geolocation module: never load the real TurboModule under Jest. Unit
// tests inject a fake Geolocation via the core interface; App.tsx only imports
// the adapter at module scope (no IO), so a stub default is enough.
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: { getCurrentPosition: jest.fn() },
}));

// AsyncStorage: a small in-memory stub (getItem/setItem/removeItem/clear). The
// package's shipped v3 mock hides behind an ESM `/jest` exports subpath that
// Jest's CJS transform can't load; this Map-backed stub matches the classic API
// the favorites adapter uses. One shared instance per test file; clear() resets.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async k => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k, v) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async k => {
        delete store[k];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
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

// Reanimated 4 test mock — worklets become no-ops under Jest. The bundled
// mock doesn't surface a couple of newer hooks as named exports, so fill them.
jest.mock('react-native-reanimated', () => {
  const base = require('react-native-reanimated/mock');
  return {
    ...base,
    useReducedMotion: base.useReducedMotion ?? (() => false),
    useFrameCallback:
      base.useFrameCallback ??
      (() => ({ setActive: () => {}, isActive: false })),
  };
});
