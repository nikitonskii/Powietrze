// Additional widget size views (systemLarge + lock-screen accessory families).
// Kept here (a file already in the target) so PowietrzeWidget.swift stays focused.
// Shares WidgetSnapshot / Color(hex:) / relativeAge / snapshotBackground from
// PowietrzeWidget.swift (same module).
import WidgetKit
import SwiftUI

// MARK: - systemLarge (home screen): number + band + all pollutant tiles

struct LargeView: View {
  let s: WidgetSnapshot
  private let columns = [GridItem(.flexible()), GridItem(.flexible())]
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(s.city.uppercased()).font(.caption).fontWeight(.semibold)
        .foregroundColor(.white.opacity(0.7)).lineLimit(1)
      HStack(alignment: .firstTextBaseline, spacing: 10) {
        Text(s.displayValue).font(.system(size: 60, weight: .bold))
          .foregroundColor(Color(hex: s.keyHex)).lineLimit(1).minimumScaleFactor(0.5)
        VStack(alignment: .leading, spacing: 2) {
          Text(s.band).font(.headline).fontWeight(.semibold)
            .foregroundColor(Color(hex: s.keyHex)).lineLimit(1)
          Text(s.scaleCaption).font(.caption2).foregroundColor(.white.opacity(0.5))
        }
      }
      if !s.tiles.isEmpty {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
          ForEach(Array(s.tiles.enumerated()), id: \.offset) { _, t in
            HStack(spacing: 6) {
              Text(t.label).font(.caption).foregroundColor(.white.opacity(0.6))
              Spacer(minLength: 4)
              Text(t.value).font(.subheadline).fontWeight(.semibold).foregroundColor(.white)
              Text(t.unit).font(.caption2).foregroundColor(.white.opacity(0.5))
            }
          }
        }
      }
      Spacer(minLength: 0)
      Text(relativeAge(s.measuredAt)).font(.caption2).foregroundColor(.white.opacity(0.45))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { snapshotBackground(s) }
  }
}

// MARK: - Lock-screen accessory families (system-tinted; color is largely ignored)

struct AccessoryCircularView: View {
  let s: WidgetSnapshot
  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 0) {
        Text(s.displayValue).font(.system(size: 22, weight: .bold))
          .minimumScaleFactor(0.5).lineLimit(1)
        Text(s.scaleCaption).font(.system(size: 8)).opacity(0.7).lineLimit(1)
      }
    }
    .containerBackground(.clear, for: .widget)
  }
}

struct AccessoryRectangularView: View {
  let s: WidgetSnapshot
  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(s.city).font(.caption2).opacity(0.7).lineLimit(1)
      Text("\(s.displayValue) \(s.scaleCaption)").font(.headline).lineLimit(1)
        .widgetAccentable()
      Text(s.band).font(.caption2).lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .containerBackground(.clear, for: .widget)
  }
}

struct AccessoryInlineView: View {
  let s: WidgetSnapshot
  var body: some View {
    // Inline shows one tinted line next to the clock.
    Text("\(s.displayValue) \(s.scaleCaption) · \(s.band)")
      .containerBackground(.clear, for: .widget)
  }
}
