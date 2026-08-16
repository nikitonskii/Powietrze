import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SettingsGroup } from '../../shared/ui/SettingsGroup';
import { Toggle } from '../../shared/ui/Toggle';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { ThresholdSlider } from '../../shared/ui/ThresholdSlider';
import { colors } from '../../shared/tokens';
import { useSettings, type SettingsApi } from '../../shared/settings';
import { SettingRow, rowHeaderStyles } from './SettingRow';

type GroupProps = Pick<SettingsApi, 'settings' | 'set'>;

// A horizontal row wired to a boolean setting via a Toggle.
function ToggleRow({
  keyName,
  title,
  subtitle,
  soon,
  testID,
  value,
  onValueChange,
}: {
  keyName: string;
  title: string;
  subtitle?: string;
  soon?: boolean;
  testID: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <SettingRow
      keyName={keyName}
      title={title}
      subtitle={subtitle}
      soon={soon}
      trailing={
        <Toggle testID={testID} value={value} onValueChange={onValueChange} />
      }
    />
  );
}

// A row whose control sits below its title (segmented control / slider).
function StackedRow({
  keyName,
  title,
  soon,
  children,
}: {
  keyName: string;
  title: string;
  soon?: boolean;
  children: ReactNode;
}) {
  return (
    <View testID={`setting-${keyName}`} style={styles.stacked}>
      <View style={styles.titleLine}>
        <Text style={rowHeaderStyles.title}>{title}</Text>
        {soon && (
          <Text testID={`wkrotce-${keyName}`} style={rowHeaderStyles.soon}>
            Wkrótce
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

function LokalizacjaGroup({ settings, set }: GroupProps) {
  return (
    <SettingsGroup label="LOKALIZACJA">
      <ToggleRow
        keyName="loc"
        title="Użyj mojej lokalizacji"
        testID="toggle-loc"
        value={settings.loc}
        onValueChange={v => set('loc', v)}
      />
      <StackedRow keyName="precision" title="Dokładność">
        <SegmentedControl
          testID="seg-precision"
          options={['Przybliżona', 'Dokładna'] as const}
          value={settings.precision}
          onChange={v => set('precision', v)}
        />
      </StackedRow>
    </SettingsGroup>
  );
}

function PowiadomieniaGroup({ settings, set }: GroupProps) {
  return (
    <SettingsGroup label="POWIADOMIENIA">
      <ToggleRow
        keyName="alert"
        title="Alert smogowy"
        testID="toggle-alert"
        value={settings.alert}
        onValueChange={v => set('alert', v)}
      />
      <StackedRow keyName="threshold" title="Próg alertu">
        <ThresholdSlider
          testID="slider-threshold"
          value={settings.threshold}
          onChange={v => set('threshold', v)}
        />
      </StackedRow>
      <SettingRow keyName="quiet" title="Godziny ciszy" value="22:00 – 07:00" />
      <ToggleRow
        keyName="morning"
        title="Poranne podsumowanie"
        subtitle="07:30"
        testID="toggle-morning"
        value={settings.morning}
        onValueChange={v => set('morning', v)}
      />
    </SettingsGroup>
  );
}

function WygladGroup({ settings, set }: GroupProps) {
  return (
    <SettingsGroup label="WIDŻET I WYGLĄD">
      <StackedRow keyName="scale" title="Skala indeksu">
        <SegmentedControl
          testID="seg-scale"
          options={['CAQI', 'US AQI', 'µg/m³'] as const}
          value={settings.scale}
          onChange={v => set('scale', v)}
        />
      </StackedRow>
    </SettingsGroup>
  );
}

function DaneGroup() {
  return (
    <SettingsGroup label="DANE">
      <SettingRow keyName="source" title="Źródło" value="GIOŚ" />
      <SettingRow
        keyName="refresh"
        title="Częstotliwość odświeżania"
        value="15 min"
      />
    </SettingsGroup>
  );
}

export function UstawieniaScreen() {
  const { settings, set } = useSettings();
  return (
    <ScrollView
      testID="screen-ustawienia"
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>Ustawienia</Text>
      <LokalizacjaGroup settings={settings} set={set} />
      <PowiadomieniaGroup settings={settings} set={set} />
      <WygladGroup settings={settings} set={set} />
      <DaneGroup />
      <Text style={styles.footer}>Dane: GIOŚ · Open-Meteo</Text>
      <Text style={styles.footer}>
        Bez konta. Ulubione zostają na telefonie.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { paddingTop: 64, paddingHorizontal: 18, paddingBottom: 130 },
  header: { fontSize: 32, fontWeight: '600', color: colors.text.primary },
  stacked: { paddingVertical: 15, paddingHorizontal: 16 },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footer: {
    fontSize: 11.5,
    color: colors.text.footer,
    textAlign: 'center',
    marginTop: 4,
  },
});
