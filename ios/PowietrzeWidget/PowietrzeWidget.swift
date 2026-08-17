// Powietrze home-screen widget. Draws the app-baked snapshot (App Group) verbatim —
// no CAQI math, no networking. App Group + key must match WidgetSync.swift.
// `@main` lives on PowietrzeWidgetBundle; this file defines the widget it lists.
import WidgetKit
import SwiftUI

private let kAppGroup = "group.com.powietrze"
private let kSnapshotKey = "widgetSnapshot"
private let kSchemaVersion = 1

// MARK: - Snapshot contract (mirrors src/core/widget WidgetSnapshot)

struct WidgetTile: Codable {
  let label: String
  let value: String
  let unit: String
}

struct WidgetSnapshot: Codable {
  let version: Int
  let city: String
  let stationLabel: String
  let displayValue: String
  let scaleCaption: String
  let band: String
  let keyHex: String
  let deepHex: String
  let midHex: String
  let tiles: [WidgetTile]
  let measuredAt: String
}

// Reads the app-published snapshot from the App Group. nil → the widget shows its
// "open the app" placeholder (absent, unparseable, or a schema-version mismatch).
func loadSnapshot() -> WidgetSnapshot? {
  guard
    let defaults = UserDefaults(suiteName: kAppGroup),
    let json = defaults.string(forKey: kSnapshotKey),
    let data = json.data(using: .utf8),
    let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
    snap.version == kSchemaVersion
  else { return nil }
  return snap
}

// MARK: - Helpers (verbatim display only)

extension Color {
  init(hex: String) {
    let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    var v: UInt64 = 0
    Scanner(string: h).scanHexInt64(&v)
    let r = Double((v & 0xFF0000) >> 16) / 255
    let g = Double((v & 0x00FF00) >> 8) / 255
    let b = Double(v & 0x0000FF) / 255
    self = Color(red: r, green: g, blue: b)
  }
}

// "X min temu" / "X godz temu" from a GIOŚ "yyyy-MM-dd HH:mm:ss" local timestamp.
func relativeAge(_ measuredAt: String, now: Date = Date()) -> String {
  let fmt = DateFormatter()
  fmt.dateFormat = "yyyy-MM-dd HH:mm:ss"
  fmt.locale = Locale(identifier: "pl_PL")
  guard let then = fmt.date(from: measuredAt) else { return "" }
  let mins = max(0, Int(now.timeIntervalSince(then) / 60))
  return mins < 60 ? "\(mins) min temu" : "\(mins / 60) godz temu"
}

// MARK: - Timeline (app-driven; no self-refresh)

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(date: Date(), snapshot: nil)
  }
  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    completion(SnapshotEntry(date: Date(), snapshot: loadSnapshot()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    // Single entry; the app reloads timelines when it publishes a new snapshot.
    completion(Timeline(entries: [SnapshotEntry(date: Date(), snapshot: loadSnapshot())], policy: .never))
  }
}

// MARK: - Views

struct PlaceholderView: View {
  var body: some View {
    VStack(spacing: 6) {
      Text("Powietrze").font(.caption2).foregroundColor(.secondary)
      Text("Otwórz aplikację").font(.footnote).foregroundColor(.secondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .containerBackground(Color(hex: "0a0e12"), for: .widget)
  }
}

func snapshotBackground(_ s: WidgetSnapshot) -> LinearGradient {
  LinearGradient(
    colors: [Color(hex: s.deepHex), Color(hex: s.midHex)],
    startPoint: .top, endPoint: .bottom
  )
}

struct SmallView: View {
  let s: WidgetSnapshot
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(s.city.uppercased()).font(.caption2).fontWeight(.semibold)
        .foregroundColor(.white.opacity(0.7)).lineLimit(1)
      Spacer(minLength: 0)
      Text(s.displayValue).font(.system(size: 52, weight: .bold))
        .foregroundColor(Color(hex: s.keyHex)).lineLimit(1).minimumScaleFactor(0.5)
      Text(s.band).font(.caption).fontWeight(.semibold)
        .foregroundColor(Color(hex: s.keyHex)).lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { snapshotBackground(s) }
  }
}

struct MediumView: View {
  let s: WidgetSnapshot
  var body: some View {
    HStack(alignment: .center, spacing: 16) {
      VStack(alignment: .leading, spacing: 2) {
        Text(s.city.uppercased()).font(.caption2).fontWeight(.semibold)
          .foregroundColor(.white.opacity(0.7)).lineLimit(1)
        Text(s.displayValue).font(.system(size: 46, weight: .bold))
          .foregroundColor(Color(hex: s.keyHex)).lineLimit(1).minimumScaleFactor(0.5)
        Text(s.band).font(.caption).fontWeight(.semibold)
          .foregroundColor(Color(hex: s.keyHex)).lineLimit(1)
        Text(relativeAge(s.measuredAt)).font(.caption2)
          .foregroundColor(.white.opacity(0.45)).lineLimit(1)
      }
      if !s.tiles.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          ForEach(Array(s.tiles.prefix(3).enumerated()), id: \.offset) { _, t in
            HStack(spacing: 6) {
              Text(t.label).font(.caption2).foregroundColor(.white.opacity(0.6))
              Spacer(minLength: 4)
              Text(t.value).font(.caption).fontWeight(.semibold).foregroundColor(.white)
              Text(t.unit).font(.caption2).foregroundColor(.white.opacity(0.5))
            }
          }
        }
        .frame(maxWidth: 130)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { snapshotBackground(s) }
  }
}

struct PowietrzeWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: SnapshotEntry
  var body: some View {
    if let s = entry.snapshot {
      switch family {
      case .systemSmall: SmallView(s: s)
      case .systemLarge: LargeView(s: s)
      case .accessoryCircular: AccessoryCircularView(s: s)
      case .accessoryRectangular: AccessoryRectangularView(s: s)
      case .accessoryInline: AccessoryInlineView(s: s)
      default: MediumView(s: s)
      }
    } else {
      switch family {
      case .accessoryInline:
        Text("Powietrze —").containerBackground(.clear, for: .widget)
      case .accessoryCircular, .accessoryRectangular:
        Text("—").containerBackground(.clear, for: .widget)
      default: PlaceholderView()
      }
    }
  }
}

struct PowietrzeWidget: Widget {
  let kind = "PowietrzeWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      PowietrzeWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Powietrze")
    .description("Jakość powietrza dla Twojego miejsca.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge,
      .accessoryCircular, .accessoryRectangular, .accessoryInline,
    ])
  }
}
