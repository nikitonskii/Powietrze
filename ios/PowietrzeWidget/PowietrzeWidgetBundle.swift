import WidgetKit
import SwiftUI

// Entry point for the widget extension. Only the static Powietrze widget ships;
// the Control-Center/AppIntent template extras were removed (see the neutralized
// PowietrzeWidgetControl.swift / AppIntent.swift).
@main
struct PowietrzeWidgetBundle: WidgetBundle {
  var body: some Widget {
    PowietrzeWidget()
  }
}
