# Task 8 — UstawieniaScreen (compose + wire)

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`. This is the integration task: replace the placeholder screen with the full settings UI, wired to the persisted store.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- **Files ≤ 200 lines**, functions ≤ 40. This screen is large — extract `SettingRow.tsx` (and, if needed, keep helpers small) to stay under 200 in each file.
- Test names cite AC IDs.
- **No hex/rgba in `src/features/**`** — colors only from `src/shared/tokens`. (Font sizes/spacing inline are fine; only colors are lint-restricted.)
- No new dependency.

## Consumes (all committed)
- `useSettings` from `src/shared/settings` — `{ settings, set }`.
- `Toggle`, `SegmentedControl`, `ThresholdSlider`, `SettingsGroup` from `src/shared/ui/*`.
- `colors` from `src/shared/tokens`.

## Files
- Modify: `src/features/ustawienia/UstawieniaScreen.tsx` (replace the placeholder)
- Create: `src/features/ustawienia/SettingRow.tsx`
- Test: `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`

## Row spec (exact — this is the contract; copy Polish glyphs verbatim)
Group order: LOKALIZACJA, POWIADOMIENIA, WIDŻET I WYGLĄD, DANE.

| Group | key | title | shape | control / value | Wkrótce? |
|---|---|---|---|---|---|
| LOKALIZACJA | loc | `Użyj mojej lokalizacji` | horizontal | `Toggle` (`toggle-loc`) → `set('loc', v)` | yes |
| LOKALIZACJA | precision | `Dokładność` | stacked | `SegmentedControl` (`seg-precision`) options `['Przybliżona','Dokładna']` → `set('precision', v)` | yes |
| POWIADOMIENIA | alert | `Alert smogowy` | horizontal | `Toggle` (`toggle-alert`) → `set('alert', v)` | yes |
| POWIADOMIENIA | threshold | `Próg alertu` | stacked | `ThresholdSlider` (`slider-threshold`) value `settings.threshold` → `set('threshold', v)` | yes |
| POWIADOMIENIA | quiet | `Godziny ciszy` | horizontal | static value `22:00 – 07:00` (– is U+2013) | yes |
| POWIADOMIENIA | morning | `Poranne podsumowanie` | horizontal | subtitle `07:30`; `Toggle` (`toggle-morning`) → `set('morning', v)` | yes |
| WIDŻET I WYGLĄD | widget | `Stacja widżetu` | horizontal | static value `Automatyczna` (NO `›` chevron) | yes |
| WIDŻET I WYGLĄD | scale | `Skala indeksu` | stacked | `SegmentedControl` (`seg-scale`) options `['CAQI','US AQI','µg/m³']` → `set('scale', v)` | yes |
| DANE | source | `Źródło` | horizontal | static value `GIOŚ` | NO |
| DANE | refresh | `Częstotliwość odświeżania` | horizontal | static value `15 min` | NO |

Footer (below the DANE group, centered, `colors.text.footer`, ~11.5px, two lines):
`Dane: GIOŚ · Open-Meteo`
`Bez konta. Ulubione zostają na telefonie.`

Header (top): `Ustawienia`, fontSize 32, fontWeight '600', `colors.text.primary`.

## testID conventions
- Each row root: `setting-<key>`.
- Wkrótce tag element: `wkrotce-<key>` (present only for the "yes" rows above).
- Controls: `toggle-<key>`, `seg-<key>` (segmented option presses hit `seg-<key>-<option>`), `slider-threshold`.

## SettingRow.tsx (horizontal rows — toggles, static values, subtitles)
```tsx
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../shared/tokens';

export function SettingRow({
  keyName,
  title,
  subtitle,
  soon,
  value,
  trailing,
}: {
  keyName: string;
  title: string;
  subtitle?: string;
  soon?: boolean;
  value?: string; // static right-aligned value (dim) — mutually exclusive with trailing
  trailing?: React.ReactNode; // a control (Toggle)
}) {
  return (
    <View testID={`setting-${keyName}`} style={styles.row}>
      <View style={styles.left}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{title}</Text>
          {soon && (
            <Text testID={`wkrotce-${keyName}`} style={styles.soon}>
              Wkrótce
            </Text>
          )}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 } as ViewStyle,
  left: { flex: 1, marginRight: 12 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, color: colors.text.primary },
  soon: { fontSize: 11, color: colors.text.faint },
  subtitle: { fontSize: 12, color: colors.text.inactive, marginTop: 2 },
  value: { fontSize: 15, color: colors.text.dim },
});
```

## UstawieniaScreen.tsx — structure guidance
- `const { settings, set } = useSettings();`
- A `ScrollView` (content is taller than the screen) with `backgroundColor: colors.base`, contentContainer padding (top ~64, horizontal 18, bottom ~130). `testID="screen-ustawienia"` on the ScrollView (keep this testID — App/AppNavigator tests use it).
- Header `Text`.
- Four `SettingsGroup`s per the table. Inside each group, children are rows in order.
  - **Horizontal rows** (loc, alert, quiet, morning, widget, source, refresh) → `<SettingRow .../>` with `trailing={<Toggle .../>}` for toggles or `value="..."` for statics.
  - **Stacked rows** (precision, threshold, scale) → a small stacked block: a `View testID={`setting-<key>`}` containing a header line (title `Text` + optional `wkrotce-<key>` tag) then the control below (`SegmentedControl` full width, or `ThresholdSlider`). You may inline these or add a tiny local `StackedRow` helper — whatever keeps files ≤200 lines.
- Footer two `Text` lines after the last group.
- Wire every control's onChange/onValueChange to `set(key, value)`; read current values from `settings`.

## Step 1: Write the failing tests (`src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`)
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

test('AC-18: exact Polish copy for every row + footer, chevron dropped', async () => {
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
  expect(screen.queryByText('Automatyczna ›')).toBeNull();
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
    const track = StyleSheet.flatten(screen.getByTestId('toggle-alert').props.style);
    expect(track.justifyContent).toBe('flex-start'); // off
  });
});
```

## Step 2: Run to verify fail
`npx jest UstawieniaScreen` → FAIL.

## Step 3: Implement SettingRow.tsx (above) + UstawieniaScreen.tsx (per structure guidance). Copy all Polish glyphs verbatim from this brief.

## Step 4: Verify pass + gate
`npx jest UstawieniaScreen` → all 6 PASS. Then the FULL suite `npm test` (nothing else broke), `npm run lint` (0 errors — watch no-hex + file-size), `npm run typecheck` (0).

## Step 5: Commit
`git add src/features/ustawienia && git commit -m "feat(ustawienia): full settings screen wired to persisted store (AC-17..22)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-8-report.md` BEFORE your final message: what you did, commit SHA, file line counts (prove ≤200), full-suite result, lint/tsc, and any deviations. Final message: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with the sandbox disabled.
