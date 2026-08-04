# Handoff: Powietrze — Air Quality App (Horizon direction)

## Overview
Powietrze is a dark-first iOS air-quality app for Poland. It answers one question — *"is the air bad right now?"* — by turning **the whole screen into the condition**: one value (the CAQI index) drives the background gradient, the particle field, the number color, the chart, and the widget tint. The selected visual direction is **Horizon** (ambient scene, skyline dissolving into haze).

Target stack: **React Native + Reanimated + react-native-skia** (shader atmosphere), with a native **SwiftUI WidgetKit** extension sharing data via App Groups. See the product spec for the data/architecture context.

## About the Design Files
The file in this bundle (`Powietrze.dc.html`) is a **design reference built in HTML/Canvas** — an interactive prototype showing intended look, motion, and behavior. It is **not production code to copy directly**. The task is to **recreate this design in React Native** using the project's established patterns (Skia for the atmosphere shader, Reanimated for the clock/gestures, native modules for widgets). The HTML uses a `<canvas>` particle loop and CSS gradients purely to approximate the real Skia shader.

To view the prototype: open `Powietrze.dc.html` in a browser. The right-hand **"Podgląd projektanta"** panel (scrubber + band chips + App/Widżety toggle) is a **demo-only control** — it is NOT part of the app UI. Use it to see all 6 index bands interpolate.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, and interactions. Recreate pixel-accurately. The one deliberate approximation is the atmosphere layer: the HTML canvas particles stand in for the Skia SkSL shader described under *Atmosphere layer* below.

## Design language
- **Type:** Poppins (300–700). SF Pro / Inter are acceptable native substitutes. The index number is by far the largest element (~128px in the 389px-wide frame; spec calls for ~120–130pt).
- **Theme:** Dark at all times, no light mode. Neutral base `#07090D`. Card surfaces `rgba(255,255,255,0.06–0.09)` with `1px` `rgba(255,255,255,0.08–0.09)` borders and `blur(20–24px)` backdrop.
- **Frame reference:** designed against a 389×844 screen (iPhone 14/15 logical). All px below are in that space.

## The color system (most important decision)
One value — the index — drives every color. Colors **interpolate continuously** between 6 anchor points (RGB lerp); 74 and 76 must look nearly identical, never snap between bands.

Anchor stops (placed at band **centers** so interpolation is smooth):

| Center value | Band (PL) | Band (EN) | Key color | Deep bg | Mid bg |
|---|---|---|---|---|---|
| 12  | Bardzo dobry | Very good | `#5FE3A1` | `#04231A` | `#0A3A2A` |
| 38  | Dobry        | Good      | `#A8E063` | `#0C2A16` | `#173D1F` |
| 63  | Umiarkowany  | Moderate  | `#F5C63D` | `#241B05` | `#3D2E08` |
| 88  | Dostateczny  | Poor      | `#FF9147` | `#2A1305` | `#43200A` |
| 125 | Zły          | Bad       | `#FF5C5C` | `#2B0B0B` | `#451212` |
| 175 | Bardzo zły   | Very bad  | `#C77DFF` | `#1C0720` | `#2E0F35` |

**Band thresholds** (for the *name*, distinct from the interpolation anchors): 0–25 Bardzo dobry · 26–50 Dobry · 51–75 Umiarkowany · 76–100 Dostateczny · 101–150 Zły · 151+ Bardzo zły.

Derived values used in the prototype (replace with real API data): `PM2.5 = round(index × 1.03)`, `PM10 = round(PM2.5 × 1.55)`, `NO₂ = round(18 + index × 0.42)`.

Interpolation algorithm (from the prototype):
```
scene(v):
  clamp v; find the two anchors bracketing v; t = (v - lo.v)/(hi.v - lo.v)
  key/deep/mid = rgbHex( lerp(hexRgb(lo[p]), hexRgb(hi[p]), t) )   for each prop
  below first / above last anchor → clamp to the end anchor
```

## Atmosphere layer (signature element)
A shader layer behind everything on the Teraz screen. In production: **react-native-skia** runtime shader (SkSL), uniforms `uTime`, `uDensity`, `uColor`; **Reanimated** drives the clock.
- **Particle density = PM2.5.** `density = clamp(PM2.5 / 135, 0.03, 1)`; particle count = `density × poolSize` (prototype pool = 260). 11µg ≈ a few faint specks; 122µg ≈ a thick oppressive field.
- Particles are the current **key color**, opacity `0.05 + density×0.32`, soft blur/glow (`shadowBlur 5 + density×9`), radius ~0.8–3.4px.
- **Motion:** drift slowly **upward** (`vy 0.08–0.36 px/frame`) with a slow horizontal sine wander (amplitude 5–17px). Ambient, not decorative.
- **Skyline:** a generic city silhouette (see the inline SVG path in the HTML) sits at ~44% screen height. As air worsens it **gains blur and loses contrast**: `blur(density×7 px)`, `opacity 1 − density×0.45`, fill `rgba(3,5,9, 0.72 − density×0.32)`. Crisp at Bardzo dobry, nearly swallowed at Bardzo zły.
- **`prefers-reduced-motion`: freeze the field, keep the density** (particles stop moving but stay present).

## Screens / Views

Navigation is a 3-tab bar only: **Teraz · Miejsca · Ustawienia**. (The "Widżety" view in the prototype is a preview surface, not an app tab.)

### 1. Teraz (main / Horizon)
- **Purpose:** glanceable current condition for the user's location.
- **Layout:** full-bleed atmosphere background (gradient + canvas + skyline, non-scrolling); content scrolls over it. `padding: 70px 24px 130px`. Hero block centered.
- **Components, top→bottom:**
  - `TWOJA LOKALIZACJA` — 12px/600, letter-spacing 2.4px, `rgba(255,255,255,.62)`, centered.
  - City — 30px/500 `#fff`.
  - Station + freshness — 12.5px `rgba(255,255,255,.5)`, e.g. `Aleja Krasińskiego · stacja GIOŚ · 12 min temu`.
  - Radial glow behind number: `radial-gradient(circle, {key}44, transparent 68%)`, 260px.
  - **Index number** — 128px/600, color = key, `text-shadow: 0 0 42px {key}88, 0 0 90px {key}44`, letter-spacing −3px.
  - Band name — 22px/500, color = key.
  - `PM2.5 · {n} µg/m³` — 14px `rgba(255,255,255,.72)`.
  - Advice — 16px/400, max-width 280px, centered, `rgba(255,255,255,.92)`, `text-wrap: pretty`. Copy per band:
    - Bardzo dobry: „Powietrze czyste. Idealny czas na spacer i sport."
    - Dobry: „Jakość dobra. Można spokojnie wyjść na zewnątrz."
    - Umiarkowany: „Umiarkowanie. Wrażliwi — rozważcie krótszy wysiłek."
    - Dostateczny: „Ogranicz długie i intensywne aktywności na zewnątrz."
    - Zły: „Zostań w domu. Zamknij okna, unikaj wysiłku."
    - Bardzo zły: „Powietrze bardzo szkodliwe. Nie wychodź bez potrzeby."
    - *(Advice tone should later shift with the health-profile setting — not in this mock.)*
  - **Below the fold** (all cards: `rgba(255,255,255,.07)` bg, `1px rgba(255,255,255,.09)` border, radius 20–22px):
    - 24h chart card — 24 bars, `gap 3px`, height 76px; each bar colored by `ramp(hourIndex)`, opacity ramps 0.55→1.0 toward "now"; axis labels 12:00/18:00/00:00/06:00/teraz.
    - Two tiles grid (`1fr 1fr`, gap 12px): PM10 and NO₂, value 30px/600 `#fff`, unit `µg/m³`.
    - Forecast card — 6 time columns (13:00…23:00): time label, colored dot (`ramp(v)` + glow), value 13px/600.
- **Tab bar:** height 88px, `rgba(10,12,17,.55)` + `blur(24px)`, top border `rgba(255,255,255,.08)`. Active Teraz icon/label tint = **key color**; Miejsca/Ustawienia active tint = accent `#8fb7ff`; inactive `rgba(255,255,255,.45)`.
- **States still to design (not in mock):** loading skeleton, no-location-permission, no-network/stale (show timestamp prominently), station offline. Pull-to-refresh.

### 2. Miejsca (favorites + search)
- **Purpose:** saved places + search/add. Background `linear-gradient(180deg,#0b0e15,#07090d)`.
- **Default state:** header „Miejsca" 32px/600 + „Edytuj" 15px/500 accent. Search field (`rgba(255,255,255,.09)`, radius 13px, magnifier icon). Below: vertical list, `gap 12px`.
  - **Each row is a miniature Horizon scene:** radius 22px, `overflow:hidden`, background `linear-gradient(120deg, {mid} 0%, {deep} 100%)` for that place's own index. Left: city 20px/500, station 11.5px, band + trend arrow (↑ index>85, ↓ index<40, → else) tinted key. Right: index 44px/600 color = key with glow. Tapping opens that place in Teraz.
  - Swipe-to-delete, long-press reorder (to implement).
- **Search state:** field focus → „Anuluj" appears. Live results: index chip (46px rounded, `linear-gradient(135deg,{mid},{deep})`, key-colored number), city, `station · distance`, `+` button to save (adds to list). Label „W POBLIŻU" when empty query, „WYNIKI" when typing. Recent-searches / nearby-suggestions surface when query is empty.
- **Seed places:** Kraków 118, Katowice 96, Warszawa 54, Zakopane 162, Gdańsk 19. **Search pool:** Poznań 63, Wrocław 71, Łódź 82, Rzeszów 58, Nowy Sącz 134, Szczecin 31, Lublin 67, Bydgoszcz 74.

### 3. Ustawienia
- Background same gradient. Header „Ustawienia" 32px/600. Grouped blocks (`rgba(255,255,255,.06)` radius 18px, section labels 11px/600 letter-spacing 1.4px `rgba(255,255,255,.4)`; rows 15px `#fff`, divided by `1px rgba(255,255,255,.06)`).
  - **Lokalizacja:** „Użyj mojej lokalizacji" toggle (on = `#34c759`); „Dokładność" segmented [Przybliżona / Dokładna], default Przybliżona.
  - **Powiadomienia:** „Alert smogowy" toggle; „Próg alertu" slider 25–200 (default 100), value colored by `ramp(threshold)`; „Godziny ciszy" 22:00–07:00; „Poranne podsumowanie" 07:30 toggle (default off).
  - **Widżet i wygląd:** „Stacja widżetu" Automatyczna ›; „Skala indeksu" segmented [CAQI / US AQI / µg/m³], default CAQI. *(v1.1: Health profile Standard/Asthma/Child/Pregnancy; Appearance Horizon/Breath/Strata.)*
  - **Dane:** Źródło GIOŚ; Częstotliwość odświeżania 15 min. Footer: „Bez konta. Ulubione zostają na telefonie."
- **Toggle spec:** track 50×30 radius 15, knob 26px white with shadow, slides left/right.
- **Segmented spec:** container `rgba(255,255,255,.08)` radius 11px pad 3px; active segment `rgba(255,255,255,.16)` `#fff`, inactive `rgba(255,255,255,.55)`.

### 4. Widgets (WidgetKit / SwiftUI — static snapshots, no animation/shader)
Reduce to a flat gradient; contrast over subtlety; legible at arm's length.
- **Small (150×150, radius 26):** `linear-gradient(155deg, {key}, {deep})`. City 13px/600, trend arrow top-right, index 52px/600 `#fff` (glow `0 0 20px {key}`), band 12px/500.
- **Medium (150 tall, radius 26):** `linear-gradient(155deg, {mid}, {deep})`. City + band top-left, index 40px/600 key top-right, 12-bar sparkline along the bottom (white bars, `ramp`-derived heights).
- **Lock circular (66px):** ring `stroke-width 6`, track `rgba(255,255,255,.18)`, fill = key, `stroke-dasharray` filled to `index/200`; index number 22px/600 centered; label „Powietrze".
- **Lock rectangular:** „POWIETRZE · {city}" 12px/600, index 34px/600 key + band name one line.
- Refresh ~30 min via WidgetKit timeline; app writes to shared App Group; tapping deep-links to that station in Teraz.

## Interactions & Behavior
- **Scrubbing the index** (demo control) recolors *everything* live — this is the product thesis; keep gradient/particles/number/chart/widget bound to one source.
- Tab switch resets search mode. Tapping a Miejsca row opens Teraz for that index.
- Search: `+` adds to places if not already present, then closes search.
- Settings toggles/segmented update immediately.
- Animation: particles ~60fps continuous upward drift; respect reduced-motion (freeze, keep density). Color transitions between bands should be continuous (interpolated), not stepped.

## State Management
- `index` (CAQI, the master value) → derives scene(key/deep/mid/band/advice/pm25/pm10/no2/density).
- `tab` (teraz | miejsca | ustawienia), `view` (app | widgets — demo only), `searchMode`, `search` query.
- `places[]` ({id, city, station, index}); add/remove/reorder.
- `settings` {loc, alert, morning (bool); precision, scale (enum)}, `threshold` (25–200).
- **Data fetching:** app queries the owned server (never GIOŚ directly). Refresh every 15 min, server-cached. Design offline/stale states (rare but required) — show the freshness timestamp prominently.

## Design Tokens
- **Colors:** base `#07090D`; card `rgba(255,255,255,.06–.09)`; border `rgba(255,255,255,.08–.09)`; text `#fff` / `.92` / `.72` / `.62` / `.5` / `.45`; accent `#8fb7ff`; toggle-on `#34c759`; + the 6 band anchor triplets above.
- **Radius:** cards 20–22px; grouped settings 18px; chips/segmented 9–13px; widget 26px; toggle track 15px.
- **Type scale:** index 128 / band 22 / city 30 / section-header 32 / body 15–16 / caption 11–13 / label 11–12 (600, letter-spacing 1.4–2.4px).
- **Spacing:** screen padding 18–24px; card padding 16–18px; grid/list gaps 12px.
- **Shadow/glow:** number `0 0 42px {key}88, 0 0 90px {key}44`; widget lift `0 12px 30px rgba(0,0,0,.4)`.

## Assets
- **Skyline:** generic city silhouette — inline SVG `<path>` in `Powietrze.dc.html` (search "M0,150"). Reusable as-is; not a specific city.
- **Icons:** tab + trend + status icons are inline SVG in the HTML; replace with SF Symbols in native (`aqi.medium`, `location`, `gearshape`, etc.).
- **Font:** Poppins (Google Fonts) → bundle or substitute SF Pro.
- No raster images; no third-party paid assets.

## Files
- `Powietrze.dc.html` — the full interactive prototype (all 4 views + demo control panel). All exact values, copy, and the interpolation/particle logic live here; the logic class (`scene`, `ramp`, `_draw`) is the source of truth for the color math and atmosphere.
