import Foundation
import WidgetKit

// The New-Architecture codegen module. codegenConfig `name: "WidgetSyncSpec"`
// generates the `NativeWidgetSyncSpec` protocol this class conforms to. The import
// resolves after `pod install` runs codegen (build graph runs codegen before this
// Swift file compiles).
import WidgetSyncSpec

// `WidgetSync` Turbo Module: persist a JSON snapshot into the App Group and reload
// WidgetKit. Generic — it knows nothing about CAQI / the app's WidgetSnapshot shape.
@objc(WidgetSync)
final class WidgetSync: NSObject, NativeWidgetSyncSpec {
  private static let suiteName = "group.org.reactjs.native.example.Powietrze"
  private static let snapshotKey = "widgetSnapshot"

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

  func reloadTimelines() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
