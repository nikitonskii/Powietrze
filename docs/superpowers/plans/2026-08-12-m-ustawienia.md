# Ustawienia (settings screen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ustawienia placeholder with the full design-mock settings screen — four grouped sections of live, AsyncStorage-persisted controls, honest "Wkrótce" tags on rows not yet wired to a feature.

**Architecture:** A pure `core/settings` model (types, defaults, clamp/slider math, merge, store interface) ← a `data/settings` AsyncStorage adapter ← a `shared/settings` React context ← reusable `shared/ui` primitives (Toggle, SegmentedControl, ThresholdSlider, SettingsGroup) ← the `features/ustawienia` screen. App.tsx injects the real store. Mirrors the existing favorites stack exactly.

**Tech Stack:** React Native 0.86, TypeScript strict, Jest + @testing-library/react-native v14 (render is async), react-native-gesture-handler + react-native-reanimated (already shipped; custom slider), react-native-linear-gradient (already shipped; slider track), @react-native-async-storage/async-storage.

## Global Constraints

- Spec: `docs/specs/009-ustawienia.md` — every AC ID below maps to it.
- TypeScript strict; `any` forbidden without an inline justification comment.
- Files ≤ 200 lines, functions ≤ 40 lines; decompose instead.
- Behavior tests, names cite AC IDs: `test('AC-13: …')`.
- Layering one-way: `core` (zero React imports) ← `shared` ← `features`. `data` → `core`. Features never import `data`.
- **No hex/rgba literals** in `src/features/**` or `src/shared/ui/**` (no-hex lint) — every color comes from `src/shared/tokens`.
- **No new dependency** (no ADR this milestone).
- AsyncStorage key: `powietrze.settings.v1`.
- Default settings literal (verbatim): `{ loc: true, alert: true, morning: false, precision: 'Przybliżona', scale: 'CAQI', threshold: 100 }`.
- Exact glyphs — copy from the spec, never retype: `µg/m³` (µ = U+00B5, ³ = U+00B3), `–` (U+2013) in `22:00 – 07:00`, `Przybliżona`, `Dokładna`, `Źródło`, `Częstotliwość`, `Ulubione zostają`. The mock's `›` chevron is intentionally dropped.
- TestID conventions (key ∈ loc, precision, alert, threshold, quiet, morning, widget, scale, source, refresh): row `setting-<key>`, tag `wkrotce-<key>`, control `toggle-<key>` / `seg-<key>` / `slider-threshold`.

---

### Task 1: Core settings model

**Files:**
- Create: `src/core/settings/index.ts`
- Test: `src/core/settings/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: `clampThreshold` reused by `thresholdFromRatio` and `mergeSettings`.
- Produces: `Settings`, `Precision`, `Scale`, `DEFAULT_SETTINGS`, `THRESHOLD_MIN`, `THRESHOLD_MAX`, `clampThreshold`, `thresholdFromRatio`, `ratioFromThreshold`, `mergeSettings`, `SettingsStore`. Consumed by Tasks 2, 5, 7.

- [ ] **Step 1: Write the failing tests** (`src/core/settings/__tests__/settings.test.ts`)

```ts
import {
  DEFAULT_SETTINGS,
  clampThreshold,
  thresholdFromRatio,
  ratioFromThreshold,
  mergeSettings,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
} from '..';

test('AC-1: DEFAULT_SETTINGS pins the design default state (literal fixture)', () => {
  expect(DEFAULT_SETTINGS).toEqual({
    loc: true,
    alert: true,
    morning: false,
    precision: 'Przybliżona',
    scale: 'CAQI',
    threshold: 100,
  });
});

test('AC-2: clampThreshold rounds and clamps, NaN→default, ±Infinity clamp', () => {
  expect(clampThreshold(10)).toBe(25);
  expect(clampThreshold(500)).toBe(200);
  expect(clampThreshold(100)).toBe(100);
  expect(clampThreshold(37.6)).toBe(38);
  expect(clampThreshold(25)).toBe(25);
  expect(clampThreshold(200)).toBe(200);
  expect(clampThreshold(NaN)).toBe(100);
  expect(clampThreshold(Infinity)).toBe(200);
  expect(clampThreshold(-Infinity)).toBe(25);
});

test('AC-3: slider math is pure, clamped, rounded, round-trips', () => {
  expect(thresholdFromRatio(0)).toBe(25);
  expect(thresholdFromRatio(1)).toBe(200);
  expect(thresholdFromRatio(0.5)).toBe(113);
  expect(thresholdFromRatio(-0.2)).toBe(25);
  expect(thresholdFromRatio(1.5)).toBe(200);
  expect(ratioFromThreshold(25)).toBe(0);
  expect(ratioFromThreshold(200)).toBe(1);
  for (let t = THRESHOLD_MIN; t <= THRESHOLD_MAX; t++) {
    expect(thresholdFromRatio(ratioFromThreshold(t))).toBe(t);
  }
});

test('AC-4: mergeSettings fills defaults, validates types/enums, clamps, drops unknowns', () => {
  expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings({ alert: false }).alert).toBe(false);
  expect(mergeSettings({ alert: false }).loc).toBe(true); // untouched key defaulted
  expect(mergeSettings({ alert: 'yes' }).alert).toBe(true); // wrong type → default
  expect(mergeSettings({ scale: 'ZZZ' }).scale).toBe('CAQI'); // invalid enum → default
  expect(mergeSettings({ threshold: 5000 }).threshold).toBe(200); // clamped
  expect((mergeSettings({ nope: 1 }) as Record<string, unknown>).nope).toBeUndefined();
  expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings(42)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings('x')).toEqual(DEFAULT_SETTINGS);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest src/core/settings -t AC-`
Expected: FAIL — module `..` not found.

- [ ] **Step 3: Implement** (`src/core/settings/index.ts`)

```ts
export type Precision = 'Przybliżona' | 'Dokładna';
export type Scale = 'CAQI' | 'US AQI' | 'µg/m³';

export interface Settings {
  loc: boolean;
  alert: boolean;
  morning: boolean;
  precision: Precision;
  scale: Scale;
  threshold: number;
}

export const THRESHOLD_MIN = 25;
export const THRESHOLD_MAX = 200;

export const DEFAULT_SETTINGS: Settings = {
  loc: true,
  alert: true,
  morning: false,
  precision: 'Przybliżona',
  scale: 'CAQI',
  threshold: 100,
};

const PRECISIONS: readonly Precision[] = ['Przybliżona', 'Dokładna'];
const SCALES: readonly Scale[] = ['CAQI', 'US AQI', 'µg/m³'];

// Round to an int and clamp into [25,200]. NaN → default; ±Infinity clamp.
export function clampThreshold(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_SETTINGS.threshold;
  const rounded = Math.round(n);
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, rounded));
}

const SPAN = THRESHOLD_MAX - THRESHOLD_MIN;

// ratio (knob position [0,1]) → clamped, rounded integer threshold.
export function thresholdFromRatio(ratio: number): number {
  return clampThreshold(THRESHOLD_MIN + ratio * SPAN);
}

// inverse → clamped [0,1].
export function ratioFromThreshold(threshold: number): number {
  return (clampThreshold(threshold) - THRESHOLD_MIN) / SPAN;
}

// Persistence seam — a fake in tests, an AsyncStorage adapter in the app.
export interface SettingsStore {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

// Hydrate arbitrary stored JSON into a valid Settings: fill missing keys from
// DEFAULT, replace wrong-typed / invalid-enum values, clamp threshold, drop
// unknown keys. Any non-object → DEFAULT.
export function mergeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    loc: bool(r.loc, DEFAULT_SETTINGS.loc),
    alert: bool(r.alert, DEFAULT_SETTINGS.alert),
    morning: bool(r.morning, DEFAULT_SETTINGS.morning),
    precision: PRECISIONS.includes(r.precision as Precision)
      ? (r.precision as Precision)
      : DEFAULT_SETTINGS.precision,
    scale: SCALES.includes(r.scale as Scale)
      ? (r.scale as Scale)
      : DEFAULT_SETTINGS.scale,
    threshold:
      typeof r.threshold === 'number'
        ? clampThreshold(r.threshold)
        : DEFAULT_SETTINGS.threshold,
  };
}
```

- [ ] **Step 4: Run to verify pass** — `npx jest src/core/settings` → PASS. Then `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(core): settings model — defaults, clamp, slider math, merge (AC-1..4)"`

---

### Task 2: AsyncStorage settings store

**Files:**
- Create: `src/data/settings/index.ts`
- Test: `src/data/settings/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `SettingsStore`, `DEFAULT_SETTINGS`, `mergeSettings` from Task 1.
- Produces: `createAsyncStorageSettingsStore(): SettingsStore`. Consumed by Task 9 (App.tsx).

- [ ] **Step 1: Write the failing tests** (mirror `src/data/favorites/__tests__/store.test.ts`)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageSettingsStore } from '..';
import { DEFAULT_SETTINGS, type Settings } from '../../../core/settings';

const KEY = 'powietrze.settings.v1';
beforeEach(() => AsyncStorage.clear());

const custom: Settings = {
  loc: false,
  alert: false,
  morning: true,
  precision: 'Dokładna',
  scale: 'µg/m³',
  threshold: 150,
};

test('AC-5: save then load round-trips exactly', async () => {
  const store = createAsyncStorageSettingsStore();
  await store.save(custom);
  expect(await store.load()).toEqual(custom);
});

test('AC-6: load with nothing stored → DEFAULT_SETTINGS', async () => {
  expect(await createAsyncStorageSettingsStore().load()).toEqual(DEFAULT_SETTINGS);
});

test('AC-7: load with corrupt JSON → DEFAULT_SETTINGS, no throw', async () => {
  await AsyncStorage.setItem(KEY, 'not json');
  expect(await createAsyncStorageSettingsStore().load()).toEqual(DEFAULT_SETTINGS);
});

test('AC-8: load with a partial/old shape → merged with defaults', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ alert: false }));
  const loaded = await createAsyncStorageSettingsStore().load();
  expect(loaded).toEqual({ ...DEFAULT_SETTINGS, alert: false });
});

test('AC-9: save swallows a setItem rejection (never throws)', async () => {
  const spy = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'));
  await expect(
    createAsyncStorageSettingsStore().save(custom),
  ).resolves.toBeUndefined();
  spy.mockRestore();
});
```

- [ ] **Step 2: Run to verify fail** — `npx jest src/data/settings` → FAIL (module not found).
- [ ] **Step 3: Implement** (`src/data/settings/index.ts`) — mirror the favorites adapter:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type SettingsStore,
} from '../../core/settings';

const KEY = 'powietrze.settings.v1';

// Persists settings as one JSON blob. Never throws: missing/corrupt loads as
// DEFAULT_SETTINGS (via mergeSettings); a failed save is swallowed (dev-logged).
export function createAsyncStorageSettingsStore(): SettingsStore {
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return mergeSettings(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },
    async save(settings) {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(settings));
      } catch (e) {
        if (__DEV__) console.warn('[settings] save failed:', e);
      }
    },
  };
}
```

- [ ] **Step 4: Run to verify pass** — `npx jest src/data/settings` → PASS. `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(data): AsyncStorage settings store (AC-5..9)"`

---

### Task 3: Tokens + Toggle primitive

**Files:**
- Modify: `src/shared/tokens/index.ts` (add tokens)
- Create: `src/shared/ui/Toggle.tsx`
- Test: `src/shared/ui/__tests__/Toggle.test.tsx`

**Interfaces:**
- Produces: new tokens `text.faint/.footer/.muted`, `control.trackOff/.segBg/.segActive/.divider`; `Toggle({ value, onValueChange, testID? })`. Tokens consumed by Tasks 3–8; Toggle by Task 8.

- [ ] **Step 1: Add the tokens.** In `src/shared/tokens/index.ts`, extend `colors.text` with `faint: 'rgba(255,255,255,0.4)'`, `footer: 'rgba(255,255,255,0.35)'`, `muted: 'rgba(255,255,255,0.55)'`, and add a sibling `control` block:

```ts
  control: {
    trackOff: 'rgba(255,255,255,0.18)',
    segBg: 'rgba(255,255,255,0.08)',
    segActive: 'rgba(255,255,255,0.16)',
    divider: 'rgba(255,255,255,0.06)',
  },
```

- [ ] **Step 2: Write the failing test** (`src/shared/ui/__tests__/Toggle.test.tsx`)

```ts
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Toggle } from '../Toggle';
import { colors } from '../../tokens';

const trackStyle = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style);

test('AC-13: on → success track, knob at end', async () => {
  const onValueChange = jest.fn();
  await render(<Toggle value onValueChange={onValueChange} testID="toggle-alert" />);
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.success);
  expect(s.justifyContent).toBe('flex-end');
  expect(s.width).toBe(50);
  expect(s.height).toBe(30);
});

test('AC-13: off → trackOff, knob at start', async () => {
  await render(<Toggle value={false} onValueChange={jest.fn()} testID="toggle-alert" />);
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.control.trackOff);
  expect(s.justifyContent).toBe('flex-start');
});

test('AC-13: press calls onValueChange with the inverse', async () => {
  const onValueChange = jest.fn();
  await render(<Toggle value onValueChange={onValueChange} testID="toggle-alert" />);
  fireEvent.press(screen.getByTestId('toggle-alert'));
  expect(onValueChange).toHaveBeenCalledWith(false);
});
```

- [ ] **Step 3: Run to verify fail** — `npx jest Toggle` → FAIL.
- [ ] **Step 4: Implement** (`src/shared/ui/Toggle.tsx`) — Pressable track + knob, styling from `Powietrze.dc.html:534-535`:

```tsx
import { Pressable, View, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function Toggle({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.success : colors.control.trackOff,
          justifyContent: value ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 15, padding: 2, flexDirection: 'row' },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
```

- [ ] **Step 5: Run to verify pass** — `npx jest Toggle` → PASS. `npm run lint && npm run typecheck` (watch no-hex — all colors are tokens).
- [ ] **Step 6: Commit** — `git commit -m "feat(shared): settings tokens + Toggle primitive (AC-13)"`

---

### Task 4: SegmentedControl primitive

**Files:**
- Create: `src/shared/ui/SegmentedControl.tsx`
- Test: `src/shared/ui/__tests__/SegmentedControl.test.tsx`

**Interfaces:**
- Produces: `SegmentedControl<T extends string>({ options, value, onChange, testID? })`. Consumed by Task 8. Each option's Pressable testID = `<testID>-<option>`.

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SegmentedControl } from '../SegmentedControl';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

const opts = ['Przybliżona', 'Dokładna'] as const;

test('AC-14: active option → primary text on segActive; others muted/transparent', async () => {
  await render(
    <SegmentedControl options={opts} value="Przybliżona" onChange={jest.fn()} testID="seg-precision" />,
  );
  expect(colorOf(screen.getByText('Przybliżona'))).toBe(colors.text.primary);
  expect(colorOf(screen.getByText('Dokładna'))).toBe(colors.text.muted);
  const active = StyleSheet.flatten(screen.getByTestId('seg-precision-Przybliżona').props.style);
  expect(active.backgroundColor).toBe(colors.control.segActive);
});

test('AC-14: pressing an option calls onChange with its value', async () => {
  const onChange = jest.fn();
  await render(
    <SegmentedControl options={opts} value="Przybliżona" onChange={onChange} testID="seg-precision" />,
  );
  fireEvent.press(screen.getByTestId('seg-precision-Dokładna'));
  expect(onChange).toHaveBeenCalledWith('Dokładna');
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** (`src/shared/ui/SegmentedControl.tsx`) — container + options, geometry from `Powietrze.dc.html:191,230,540`:

```tsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.container}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            testID={testID ? `${testID}-${opt}` : undefined}
            onPress={() => onChange(opt)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, { color: active ? colors.text.primary : colors.text.muted }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.control.segBg, borderRadius: 11, padding: 3 },
  option: { flex: 1, alignItems: 'center', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 4 },
  optionActive: { backgroundColor: colors.control.segActive },
  label: { fontSize: 13, fontWeight: '500' },
});
```

- [ ] **Step 4: Run to verify pass** — `npx jest SegmentedControl` → PASS. `npm run lint && npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(shared): SegmentedControl primitive (AC-14)"`

---

### Task 5: ThresholdSlider primitive

**Files:**
- Create: `src/shared/ui/ThresholdSlider.tsx`
- Test: `src/shared/ui/__tests__/ThresholdSlider.test.tsx`

**Interfaces:**
- Consumes: `thresholdFromRatio`, `ratioFromThreshold` from Task 1; `scene` from `core/scene`; `LinearGradient` (already mocked in jest.setup as a View).
- Produces: `ThresholdSlider({ value, onChange, testID? })`. Consumed by Task 8.

**Note:** the physical pan is AC-24 (manual) — jest can't drive gestures (008 precedent). Tests cover the rendered value color, the gradient endpoints, and that `onChange` routes through the pure integer math. Keep the file ≤ 200 lines and the gesture callback ≤ 40.

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThresholdSlider } from '../ThresholdSlider';
import { scene } from '../../../core/scene';
import { colorOf } from '../../test/colorOf';
import { colors } from '../../tokens';

test('AC-15: value text is tinted scene(value).key', async () => {
  await render(<ThresholdSlider value={100} onChange={jest.fn()} testID="slider-threshold" />);
  expect(screen.getByText('100')).toBeTruthy();
  expect(colorOf(screen.getByText('100'))).toBe(scene(100).key);
});

test('AC-15: track gradient runs scene(value).key → white .15, horizontally', async () => {
  await render(<ThresholdSlider value={150} onChange={jest.fn()} testID="slider-threshold" />);
  const fill = screen.getByTestId('slider-threshold-fill');
  expect(fill.props.colors).toEqual([scene(150).key, colors.control.trackOff]);
  expect(fill.props.start).toEqual({ x: 0, y: 0 });
  expect(fill.props.end).toEqual({ x: 1, y: 0 });
});
```

(The gradient's white endpoint is the mock's `rgba(255,255,255,.15)`; reuse the nearest existing token — add `colors.control.trackOff` is `.18`. If an exact `.15` is wanted, add a `control.trackFade: 'rgba(255,255,255,0.15)'` token in Step 3 and assert that instead. Implementer: pick one and keep test + impl consistent.)

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** (`src/shared/ui/ThresholdSlider.tsx`). Measure the track width with `onLayout`; a `Gesture.Pan` maps `x/width` → `thresholdFromRatio` → `onChange` via `runOnJS`; the knob sits at `ratioFromThreshold(value)`. Value + gradient use `scene(value).key`.

```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { scene } from '../../core/scene';
import { thresholdFromRatio, ratioFromThreshold } from '../../core/settings';
import { colors } from '../tokens';

export function ThresholdSlider({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const key = scene(value).key;
  const emit = (x: number) => onChange(thresholdFromRatio(width ? x / width : 0));
  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(emit)(e.x))
    .onUpdate(e => runOnJS(emit)(e.x));
  const knobLeft = ratioFromThreshold(value) * width;

  return (
    <View testID={testID}>
      <Text style={[styles.value, { color: key }]}>{value}</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
          <LinearGradient
            testID={testID ? `${testID}-fill` : undefined}
            colors={[key, colors.control.trackOff]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.knob, { left: Math.max(0, knobLeft - 11) }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 15, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', justifyContent: 'center' },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text.primary },
});
```

(Implementer note: the `overflow:'hidden'` track clips the knob; if the knob must overhang, split into an outer un-clipped wrapper for the knob and an inner clipped gradient. Verify visually in AC-24.)

- [ ] **Step 4: Run to verify pass** — `npx jest ThresholdSlider` → PASS. `npm run lint && npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(shared): ThresholdSlider (pure math + gradient; drag=AC-24) (AC-15)"`

---

### Task 6: SettingsGroup primitive

**Files:**
- Create: `src/shared/ui/SettingsGroup.tsx`
- Test: `src/shared/ui/__tests__/SettingsGroup.test.tsx`

**Interfaces:**
- Produces: `SettingsGroup({ label, children })` — section label (rendered verbatim; caller passes uppercased) + card with dividers between adjacent rows (none after the last). Consumed by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SettingsGroup } from '../SettingsGroup';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

test('AC-16: label rendered verbatim in faint, card wraps children', async () => {
  await render(
    <SettingsGroup label="DANE">
      <Text>row-a</Text>
      <Text>row-b</Text>
    </SettingsGroup>,
  );
  const label = screen.getByText('DANE');
  expect(colorOf(label)).toBe(colors.text.faint);
  const s = StyleSheet.flatten(label.props.style);
  expect(s.fontSize).toBe(11);
  expect(s.fontWeight).toBe('600');
  expect(s.letterSpacing).toBe(1.4);
  expect(screen.getByText('row-a')).toBeTruthy();
  expect(screen.getByText('row-b')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** — insert a `colors.control.divider` hairline between adjacent children (React.Children with index; skip after last). Card `colors.card`, radius 18, `overflow:'hidden'`.

```tsx
import { Children, Fragment, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {row}
            {i < rows.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, color: colors.text.faint, paddingHorizontal: 12, paddingBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.control.divider },
});
```

- [ ] **Step 4: Run to verify pass** — `npx jest SettingsGroup`. `npm run lint && npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(shared): SettingsGroup primitive (AC-16)"`

---

### Task 7: Settings context (SettingsProvider / useSettings)

**Files:**
- Create: `src/shared/settings/index.ts`
- Test: `src/shared/settings/__tests__/context.test.tsx`

**Interfaces:**
- Consumes: `Settings`, `SettingsStore`, `DEFAULT_SETTINGS` from Task 1.
- Produces: `SettingsProvider({ store, children })`, `useSettings(): { settings, set }`. Consumed by Tasks 8, 9. Mirror `FavoritesContext.tsx` (functional-updater persistence).

- [ ] **Step 1: Write the failing tests** (use `renderHook` + a fake store)

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '..';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';

const fakeStore = (initial: Settings = DEFAULT_SETTINGS) => {
  const saved: Settings[] = [];
  const store: SettingsStore = {
    load: async () => initial,
    save: async s => {
      saved.push(s);
    },
  };
  return { store, saved };
};
const wrap = (store: SettingsStore) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SettingsProvider store={store}>{children}</SettingsProvider>;
  };

test('AC-10: starts at DEFAULT_SETTINGS then hydrates from store', async () => {
  const { store } = fakeStore({ ...DEFAULT_SETTINGS, alert: false });
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  expect(result.current.settings).toEqual(DEFAULT_SETTINGS); // pre-hydration
  await waitFor(() => expect(result.current.settings.alert).toBe(false)); // hydrated
});

test('AC-11: set updates state and persists the full settings', async () => {
  const { store, saved } = fakeStore();
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  act(() => result.current.set('alert', false));
  expect(result.current.settings.alert).toBe(false);
  await waitFor(() => expect(saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, alert: false }));
});

test('AC-12: successive set calls compose (functional updater)', async () => {
  const { store, saved } = fakeStore();
  const { result } = renderHook(() => useSettings(), { wrapper: wrap(store) });
  await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  act(() => {
    result.current.set('alert', false);
    result.current.set('morning', true);
  });
  expect(result.current.settings.alert).toBe(false);
  expect(result.current.settings.morning).toBe(true);
  await waitFor(() =>
    expect(saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, alert: false, morning: true }),
  );
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** (`src/shared/settings/index.ts`) — functional updater persists `next` (composes correctly):

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../core/settings';

export interface SettingsApi {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const Ctx = createContext<SettingsApi | null>(null);

export function SettingsProvider({ store, children }: { store: SettingsStore; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let on = true;
    store.load().then(s => on && setSettings(s));
    return () => {
      on = false;
    };
  }, [store]);

  const value = useMemo<SettingsApi>(
    () => ({
      settings,
      set: (key, val) =>
        setSettings(prev => {
          const next = { ...prev, [key]: val };
          store.save(next);
          return next;
        }),
    }),
    [settings, store],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings: wrap the tree in <SettingsProvider>');
  return v;
}
```

- [ ] **Step 4: Run to verify pass** — `npx jest src/shared/settings`. `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(shared): settings context, functional-updater persistence (AC-10..12)"`

---

### Task 8: UstawieniaScreen

**Files:**
- Modify: `src/features/ustawienia/UstawieniaScreen.tsx` (replace placeholder)
- Create: `src/features/ustawienia/SettingRow.tsx` (row layout + Wkrótce tag — keeps the screen ≤ 200 lines)
- Test: `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`

**Interfaces:**
- Consumes: `useSettings` (Task 7); `Toggle`, `SegmentedControl`, `ThresholdSlider`, `SettingsGroup` (Tasks 3–6); `GradientBackground` if used by peers; tokens.
- Produces: the composed screen. `SettingRow({ title, subtitle?, keyName, soon?, trailing?, children? })` renders `setting-<keyName>`, optional `wkrotce-<keyName>` tag, title/subtitle, and a trailing control.

- [ ] **Step 1: Write the failing tests** — render inside `SettingsProvider` with a fake store + `GestureHandlerRootView` (ThresholdSlider uses a GestureDetector).

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UstawieniaScreen } from '../UstawieniaScreen';
import { SettingsProvider } from '../../../shared/settings';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';

const store = (initial: Settings = DEFAULT_SETTINGS): SettingsStore & { saved: Settings[] } => {
  const saved: Settings[] = [];
  return { saved, load: async () => initial, save: async s => { saved.push(s); } };
};
const renderScreen = (s: SettingsStore) =>
  render(
    <GestureHandlerRootView>
      <SettingsProvider store={s}>
        <UstawieniaScreen />
      </SettingsProvider>
    </GestureHandlerRootView>,
  );

test('AC-17: header + four section labels in order', async () => {
  await renderScreen(store());
  for (const label of ['Ustawienia', 'LOKALIZACJA', 'POWIADOMIENIA', 'WIDŻET I WYGLĄD', 'DANE']) {
    expect(screen.getByText(label)).toBeTruthy();
  }
});

test('AC-18: exact Polish copy for every row + footer', async () => {
  await renderScreen(store());
  for (const t of [
    'Użyj mojej lokalizacji', 'Dokładność', 'Alert smogowy', 'Próg alertu',
    'Godziny ciszy', '22:00 – 07:00', 'Poranne podsumowanie', '07:30',
    'Stacja widżetu', 'Automatyczna', 'Skala indeksu', 'Źródło', 'GIOŚ',
    'Częstotliwość odświeżania', '15 min',
    'Dane: GIOŚ · Open-Meteo', 'Bez konta. Ulubione zostają na telefonie.',
  ]) {
    expect(screen.getByText(t)).toBeTruthy();
  }
  expect(screen.queryByText('Automatyczna ›')).toBeNull(); // chevron dropped
});

test('AC-19: toggling Alert smogowy persists alert inverted', async () => {
  const s = store();
  await renderScreen(s);
  fireEvent.press(screen.getByTestId('toggle-alert'));
  await waitFor(() => expect(s.saved.at(-1)?.alert).toBe(false));
});

test('AC-20: choosing Dokładna persists precision', async () => {
  const s = store();
  await renderScreen(s);
  fireEvent.press(screen.getByTestId('seg-precision-Dokładna'));
  await waitFor(() => expect(s.saved.at(-1)?.precision).toBe('Dokładna'));
});

test('AC-21: Wkrótce tags on unwired/placeholder rows only', async () => {
  await renderScreen(store());
  for (const k of ['loc', 'precision', 'alert', 'threshold', 'quiet', 'morning', 'widget', 'scale']) {
    expect(screen.getByTestId(`wkrotce-${k}`)).toBeTruthy();
  }
  expect(screen.queryByTestId('wkrotce-source')).toBeNull();
  expect(screen.queryByTestId('wkrotce-refresh')).toBeNull();
});

test('AC-22: preloaded non-default store hydrates the controls', async () => {
  await renderScreen(store({ ...DEFAULT_SETTINGS, alert: false }));
  await waitFor(() => {
    const track = require('react-native').StyleSheet.flatten(screen.getByTestId('toggle-alert').props.style);
    expect(track.justifyContent).toBe('flex-start'); // off
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement `SettingRow.tsx`** — a row: left title (+ optional subtitle), optional `Wkrótce` tag (`wkrotce-<keyName>`, styled small in `colors.text.faint`), and a `trailing` slot (control) or a static value. Root `testID={`setting-${keyName}`}`.
- [ ] **Step 4: Implement `UstawieniaScreen.tsx`** — read `const { settings, set } = useSettings();`, compose four `SettingsGroup`s per the spec/mock, wire each control to `set(...)`. Use a `ScrollView` (content is taller than a screen; mock `min-height:844px`, `padding:64px 18px 130px`). Footer `Text` in `colors.text.footer`, size 11.5, centered. Static value rows (`Godziny ciszy`, `Stacja widżetu`, `Źródło`, `Częstotliwość`) use `colors.text.dim` for the value. Keep the file ≤ 200 lines — if it grows, extract each `SettingsGroup` into a small local component.
- [ ] **Step 5: Run to verify pass** — `npx jest UstawieniaScreen`. `npm run lint && npm run typecheck`. Then the full suite: `npm test`.
- [ ] **Step 6: Commit** — `git commit -m "feat(ustawienia): full settings screen wired to persisted store (AC-17..22)"`

---

### Task 9: App.tsx production wiring

**Files:**
- Modify: `App.tsx` (module-scope store + provider)
- Modify/Extend: `App.test.tsx` (navigate to Ustawienia)

**Interfaces:**
- Consumes: `createAsyncStorageSettingsStore` (Task 2), `SettingsProvider` (Task 7).

- [ ] **Step 1: Write the failing test** — extend `App.test.tsx`: render `<App />`, press the Ustawienia tab, assert the screen renders (proves the provider is present — otherwise `useSettings` throws).

```ts
test('AC-23: App wires SettingsProvider — Ustawienia renders without throwing', async () => {
  await render(<App />);
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByText('Ustawienia')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify fail** — FAIL: `useSettings: wrap the tree in <SettingsProvider>`.
- [ ] **Step 3: Implement** — in `App.tsx`, add `const settingsStore = createAsyncStorageSettingsStore();` at module scope (beside `favoritesStore`) and wrap the tree with `<SettingsProvider store={settingsStore}>` alongside `FavoritesProvider` (inside `GestureHandlerRootView`).
- [ ] **Step 4: Run to verify pass** — `npm test`. `npm run lint && npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(app): wire SettingsProvider with AsyncStorage store (AC-23)"`

---

### Task 10: Native run + manual AC-24 + journal

**Files:**
- Create: `docs/harness/09-ustawienia.md` (journal)
- Create: `docs/harness/evidence/09/` (screenshot(s))

- [ ] **Step 1: Full gate** — `npm run lint && npm run typecheck && npm test` all green; `src/core` coverage still 100%.
- [ ] **Step 2: Build + run** on the iPhone 16 Pro sim (sandbox disabled): confirm the Ustawienia tab renders the four groups, toggles flip, segmented selects, the slider drags and recolors (AC-24), and values survive an app relaunch (persistence).
- [ ] **Step 3: Capture** a screenshot of the finished screen + note the drag behavior in the journal (AC-24 evidence).
- [ ] **Step 4: Write** `docs/harness/09-ustawienia.md` — milestone summary, deviations, reusable gotchas (esp. any slider/gesture/gradient issues), AC coverage table (AC-1..24), and the manual-AC evidence.
- [ ] **Step 5: Commit** — `git commit -m "docs(harness): journal 09 ustawienia + AC-24 evidence"`

---

## Self-Review

**Spec coverage:** AC-1..4 → T1; AC-5..9 → T2; AC-13 → T3; AC-14 → T4; AC-15 → T5; AC-16 → T6; AC-10..12 → T7; AC-17..22 → T8; AC-23 → T9; AC-24 → T10. All 24 ACs covered.

**Placeholder scan:** no TBD/TODO; every code step has real code or an exact edit description with the file + insertion point.

**Type consistency:** `Settings`/`SettingsStore`/`DEFAULT_SETTINGS` defined in T1 and imported identically in T2/T5/T7; `set`'s generic signature matches across T7/T8; token names (`control.trackOff/segBg/segActive/divider`, `text.faint/footer/muted`) defined in T3 and used verbatim thereafter; testID conventions applied consistently (`toggle-alert`, `seg-precision-Dokładna`, `slider-threshold-fill`, `setting-<key>`, `wkrotce-<key>`).

**Open implementer decision (flagged, not a gap):** the slider track's white gradient endpoint — reuse `colors.control.trackOff` (.18) or add a `.15` token; T5 says pick one and keep test+impl consistent.
