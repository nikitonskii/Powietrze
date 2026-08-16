import Foundation
import WidgetKit

// `WidgetSync` native module: persist a JSON snapshot into the App Group and reload
// WidgetKit. Written in Swift because `WidgetCenter` is Swift-only. Exposed to React
// Native via `RCT_EXTERN_MODULE` (see WidgetSync.mm) and served through the New
// Architecture interop layer (bridgeless) — `TurboModuleRegistry.get('WidgetSync')`
// resolves it. Generic: it knows nothing about CAQI / the app's WidgetSnapshot shape.
@objc(WidgetSync)
final class WidgetSync: NSObject {
  private static let suiteName = "group.org.reactjs.native.example.Powietrze"
  private static let snapshotKey = "widgetSnapshot"

  @objc(writeSnapshot:)
  func writeSnapshot(_ json: String) {
    guard let defaults = UserDefaults(suiteName: Self.suiteName) else {
      // The App Group entitlement is missing on this target — the write would
      // silently vanish. Fail loudly in dev so the entitlement gap is caught.
      assertionFailure(
        "WidgetSync: App Group \(Self.suiteName) is not entitled on this target — snapshot dropped"
      )
      return
    }
    defaults.set(json, forKey: Self.snapshotKey)
  }

  @objc(reloadTimelines)
  func reloadTimelines() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
