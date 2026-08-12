import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SettingsGroup } from '../../shared/ui/SettingsGroup';
import { Toggle } from '../../shared/ui/Toggle';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { ThresholdSlider } from '../../shared/ui/ThresholdSlider';
import { colors } from '../../shared/tokens';
import { useSettings } from '../../shared/settings';
import { SettingRow } from './SettingRow';

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
        <Text style={styles.title}>{title}</Text>
        {soon && (
          <Text testID={`wkrotce-${keyName}`} style={styles.soon}>
            Wkrótce
          </Text>
        )}
      </View>
      {children}
    </View>
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

      <SettingsGroup label="LOKALIZACJA">
        <SettingRow
          keyName="loc"
          title="Użyj mojej lokalizacji"
          soon
          trailing={
            <Toggle
              testID="toggle-loc"
              value={settings.loc}
              onValueChange={v => set('loc', v)}
            />
          }
        />
        <StackedRow keyName="precision" title="Dokładność" soon>
          <SegmentedControl
            testID="seg-precision"
            options={['Przybliżona', 'Dokładna'] as const}
            value={settings.precision}
            onChange={v => set('precision', v)}
          />
        </StackedRow>
      </SettingsGroup>

      <SettingsGroup label="POWIADOMIENIA">
        <SettingRow
          keyName="alert"
          title="Alert smogowy"
          soon
          trailing={
            <Toggle
              testID="toggle-alert"
              value={settings.alert}
              onValueChange={v => set('alert', v)}
            />
          }
        />
        <StackedRow keyName="threshold" title="Próg alertu" soon>
          <ThresholdSlider
            testID="slider-threshold"
            value={settings.threshold}
            onChange={v => set('threshold', v)}
          />
        </StackedRow>
        <SettingRow
          keyName="quiet"
          title="Godziny ciszy"
          soon
          value="22:00 – 07:00"
        />
        <SettingRow
          keyName="morning"
          title="Poranne podsumowanie"
          subtitle="07:30"
          soon
          trailing={
            <Toggle
              testID="toggle-morning"
              value={settings.morning}
              onValueChange={v => set('morning', v)}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup label="WIDŻET I WYGLĄD">
        <SettingRow
          keyName="widget"
          title="Stacja widżetu"
          soon
          value="Automatyczna"
        />
        <StackedRow keyName="scale" title="Skala indeksu" soon>
          <SegmentedControl
            testID="seg-scale"
            options={['CAQI', 'US AQI', 'µg/m³'] as const}
            value={settings.scale}
            onChange={v => set('scale', v)}
          />
        </StackedRow>
      </SettingsGroup>

      <SettingsGroup label="DANE">
        <SettingRow keyName="source" title="Źródło" value="GIOŚ" />
        <SettingRow
          keyName="refresh"
          title="Częstotliwość odświeżania"
          value="15 min"
        />
      </SettingsGroup>

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
  title: { fontSize: 15, color: colors.text.primary },
  soon: { fontSize: 11, color: colors.text.faint },
  footer: {
    fontSize: 11.5,
    color: colors.text.footer,
    textAlign: 'center',
    marginTop: 4,
  },
});
