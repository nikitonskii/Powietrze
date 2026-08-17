import WidgetSyncModule from 'react-native-widget-sync';
import type { WidgetSync, WidgetSnapshot } from '../../core/widget';

// Adapts the app's pure `WidgetSync` seam onto the generic `react-native-widget-sync`
// Turbo Module (New Architecture): serialize the baked snapshot to JSON, write it to
// the App Group, and reload the widget's timelines. `WidgetSyncModule` is null when
// the native module is absent (Android, or an iOS build before the widget extension
// gate) — publish then no-ops, so the app never crashes because the widget is unreachable.
export function createNativeWidgetSync(): WidgetSync {
  return {
    publish(snapshot: WidgetSnapshot) {
      if (!WidgetSyncModule) return;
      WidgetSyncModule.writeSnapshot(JSON.stringify(snapshot));
      WidgetSyncModule.reloadTimelines();
    },
  };
}
