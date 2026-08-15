import { NativeModules } from 'react-native';
import type { WidgetSync, WidgetSnapshot } from '../../core/widget';

// The native RCTBridgeModule seam (Task 4, Swift). Typed locally rather than
// widening NativeModules — the module is absent on Android / pre-extension
// builds, hence the optional type.
interface NativeWidgetSyncModule {
  writeSnapshot(json: string): void;
  reloadTimelines(): void;
}

// The @react-native implementation of the pure `WidgetSync` seam. Writes the
// baked snapshot into the App-Group UserDefaults and reloads the widget's
// timelines. Safe no-op when the native module isn't present (Android, or
// iOS before the widget extension gate is built) — the app must never crash
// because the widget can't be reached.
export function createNativeWidgetSync(): WidgetSync {
  const mod = NativeModules.WidgetSync as NativeWidgetSyncModule | undefined;
  return {
    publish(snapshot: WidgetSnapshot) {
      if (!mod) return;
      mod.writeSnapshot(JSON.stringify(snapshot));
      mod.reloadTimelines();
    },
  };
}
