# ADR-011: On-device favorites via @react-native-async-storage/async-storage

**Status:** accepted · **Date:** 2026-08-12 · **Milestone:** M-miejsca

## Context
Favorites must persist on the device with no account ("Ulubione zostają na
telefonie"). Bare React Native 0.86, New Architecture.

## Decision
Use `@react-native-async-storage/async-storage` (v3.1.1), wrapped behind the pure
`core/places` `FavoritesStore` interface in a `src/data/favorites` adapter. The
adapter uses only the classic `getItem`/`setItem` API (present on the v3 default
export, which proxies to the native store), storing the whole list as one JSON blob.

## Alternatives considered
- **react-native-mmkv** — faster, but another native dep; unneeded for a tiny list.
- **expo-secure-store / expo-file-system** — need the Expo modules runtime.
- **@react-native-async-storage/async-storage** — the community-standard KV store,
  New-Arch compatible (ships `AsyncStorage.podspec` + `apple/` sources), smallest
  fit. Chosen.

## Consequences
- One pod (`pod install`).
- Jest: a small hand-rolled in-memory mock in `jest.setup.js` (the package's shipped
  mock in v3 sits behind an ESM `/jest` exports subpath that Jest's CJS transform
  would choke on; a 6-line Map-backed stub of `getItem/setItem/removeItem/clear` is
  more robust and matches exactly the API the adapter uses).
- Not encrypted (favorites are non-sensitive). Single JSON blob under one key
  (`powietrze.favorites.v1`).
