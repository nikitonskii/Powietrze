import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// New-Architecture native-module contract. The native side is a Swift module
// exposed via RCT_EXTERN_MODULE and served through the bridgeless interop layer;
// `TurboModuleRegistry.get('WidgetSync')` resolves it at runtime.
export interface Spec extends TurboModule {
  // Persist a JSON string into the App Group so a WidgetKit extension can read it.
  writeSnapshot(json: string): void;
  // Ask WidgetKit to reload all timelines (redraw widgets with the new snapshot).
  reloadTimelines(): void;
}

// Nullable `get` (NOT getEnforcing): returns null when the native module is absent
// (Android, or an app built before the extension) so callers can degrade to a no-op
// instead of throwing.
export default TurboModuleRegistry.get<Spec>('WidgetSync');
