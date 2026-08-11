# ADR-010: Device geolocation via @react-native-community/geolocation

**Status:** accepted · **Date:** 2026-08-11 · **Milestone:** M-loc

## Context
M-loc needs the device's current coordinates to pick the nearest GIOŚ station.
The app is bare React Native 0.86 on the New Architecture.

## Decision
Use `@react-native-community/geolocation` (v3.4.0), wrapped behind the pure
`core/geo` `Geolocation` interface in a thin `src/data/location` adapter.

## Alternatives considered
- **react-native-geolocation-service** — effectively unmaintained; no active
  New-Arch support.
- **expo-location** — requires the Expo modules runtime, heavy to add to a
  bare RN app for one API.
- **@react-native-community/geolocation** — the community standard, supports
  the New Architecture on RN 0.86, smallest footprint for a bare app. Chosen.

## Consequences
- Adds one pod (`pod install`) and an iOS `NSLocationWhenInUseUsageDescription`
  usage string.
- Only "when in use" permission; no background location.
- The adapter is the sole untested-by-unit piece (thin; covered by manual AC 005-8).
