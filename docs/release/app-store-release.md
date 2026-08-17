# Powietrze — App Store release runbook

Goal: get **v1.0 (build 1)** submitted to the App Store today.
Realistic expectation: the binary can be **uploaded and submitted today**;
Apple's review is out of our hands (often < 24 h now, but not guaranteed
same-day). "Submitted today" is the achievable target.

## Release identity (locked in)

| Field | Value |
|---|---|
| iOS bundle ID | `com.powietrze` |
| Widget bundle ID | `com.powietrze.PowietrzeWidget` |
| App Group | `group.com.powietrze` |
| Android applicationId | `com.powietrze` |
| Version (marketing) | `1.0` |
| Build (CURRENT_PROJECT_VERSION) | `1` |
| Apple Team ID | `QCFDVWCY6F` |

---

## Part A — Repo prep

- [x] App icons installed (iOS `AppIcon.appiconset` incl. dark/tinted; Android adaptive icons all densities)
- [x] Bundle ID changed off the `org.reactjs.native.example.*` template → `com.powietrze`
- [x] Widget bundle ID + App Group renamed to match (entitlements + both Swift files)
- [x] `ITSAppUsesNonExemptEncryption = false` in Info.plist (no export-compliance prompt)
- [x] `PrivacyInfo.xcprivacy` present with UserDefaults / FileTimestamp / BootTime reasons
- [x] Location usage string present (Polish)
- [ ] Commit all of the above (currently uncommitted on `feature/m-widget`)

**Notifications:** complete for v1. They are **local** notifications (notifee
timestamp triggers) — no APNs, no Push capability, no `aps-environment`
entitlement, **nothing to configure in App Store Connect**.

---

## Part B — Apple Developer portal (developer.apple.com → Certificates, IDs & Profiles)

With **Automatic signing** in Xcode, most of this is created for you on first
archive. Do it manually only if Xcode reports a problem.

- [ ] **App Group** `group.com.powietrze` exists (Identifiers → App Groups). Xcode does *not* always auto-create groups — create it here if archive complains.
- [ ] App ID `com.powietrze` has the **App Groups** capability enabled and is a member of the group above.
- [ ] App ID `com.powietrze.PowietrzeWidget` likewise a member of the group.
- [ ] A valid **Apple Distribution** certificate exists (Xcode manages this under Automatic signing).

---

## Part C — App Store Connect (appstoreconnect.apple.com)

### C1. Create the app record
- [ ] My Apps → **+** → New App
  - Platform: iOS
  - Name: **Powietrze** (must be globally unique on the App Store — have a fallback ready, e.g. "Powietrze — Jakość powietrza")
  - Primary language: **Polish**
  - Bundle ID: `com.powietrze`
  - SKU: `powietrze-ios` (any internal string)

### C2. Listing metadata (Polish)
- [ ] Subtitle (≤ 30 chars), e.g. "Jakość powietrza na żywo"
- [ ] Promotional text (optional)
- [ ] Description
- [ ] Keywords (≤ 100 chars, comma-separated)
- [ ] Support URL (**required**) — a page or email link
- [ ] Marketing URL (optional)
- [ ] **Privacy Policy URL (required)** — host `docs/release/privacy-policy.md` (see Part F)
- [ ] Category: **Weather** (primary) — Utilities is a reasonable alternative
- [ ] Age rating questionnaire → will come out **4+** (no objectionable content)

### C3. App Privacy (Privacy → Get Started)
Answer based on the verified data behavior:
- [ ] **Data collection: "No, we do not collect data from this app."**
  Rationale: location is used only on-device and never transmitted; there is no
  account, analytics, or tracking. (Apple's "collect" = data leaving the device.)
- [ ] Tracking: **No**

### C4. Pricing & availability
- [ ] Price: **Free**
- [ ] Availability: Poland (at minimum); worldwide is fine — data is Poland-only

---

## Part D — Assets you must produce

- [x] App icon 1024 (App Store Connect pulls it from the build; a standalone copy is at `Downloads/app_icons_powietrze/store/app-store-1024.png`)
- [ ] **Screenshots** — required. Capture from the iPhone 16 Pro simulator (⌘S saves to Desktop):
  - **6.9"** (iPhone 16 Pro Max, 1320×2868) — required
  - **6.5"** (1242×2688) — required if you don't provide 6.9"; providing 6.9" now covers most sizes
  - 3–5 shots: Teraz hero, 24h chart, Miejsca, Ustawienia, widget on home screen
  - iPad screenshots only if you mark the app iPhone-only = not required (leave "iPad" unchecked)

---

## Part E — Build → Archive → Upload → Submit

Do this in **Xcode** for the first submission (most reliable for signing/upload).

### E1. One-time in Xcode
- [ ] Open `ios/Powietrze.xcworkspace`
- [ ] Target **Powietrze** → Signing & Capabilities → Team = your team, **Automatically manage signing** on. Repeat for the **PowietrzeWidgetExtension** target.
- [ ] Confirm App Icon = `AppIcon` (General → App Icons and Launch Screen)
- [ ] Scheme **Powietrze** → set build configuration to **Release**; destination = **Any iOS Device (arm64)**

### E2. Archive
- [ ] Product → **Archive**  (this is a real device build; it will not archive against a simulator destination)
- [ ] When the Organizer opens: **Distribute App → App Store Connect → Upload**
- [ ] Let Xcode re-sign with the Distribution profile and upload

CLI alternative (only if you prefer it):
```bash
cd ios
xcodebuild -workspace Powietrze.xcworkspace -scheme Powietrze \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath build/Powietrze.xcarchive archive
xcodebuild -exportArchive -archivePath build/Powietrze.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/export
# then upload build/export/*.ipa via Transporter.app or `xcrun altool`/`notarytool`
```
(Xcode Organizer is simpler — it writes the ExportOptions and uploads in one flow.)

### E3. In App Store Connect after the upload processes (~5–30 min)
- [ ] The build appears under the app's version → select it as the **Build**
- [ ] Fill any remaining metadata fields flagged with a yellow dot
- [ ] **Add for Review → Submit**
- [ ] Answer "Export Compliance" if asked → **No** (already declared via Info.plist, so it likely won't ask)

---

## Part F — Hosting the privacy policy (fast options)

You need a public URL. Fastest:
1. **GitHub Pages / Gist** — paste `docs/release/privacy-policy.md` into a public
   Gist or a `gh-pages` file; use its raw/rendered URL.
2. Any static host (Netlify drop, Vercel, a page on your own domain).

---

## Deferred (NOT blocking this release)

- Live air-quality **content inside** notifications + closed-app refresh (BGTaskScheduler native gate)
- Android release (Play Console): needs a **release keystore** (currently signed with debug) and the **`POST_NOTIFICATIONS`** permission in `AndroidManifest.xml` for Android 13+. Icons are already in place.
- `CFBundleDevelopmentRegion` is `en`; optional to switch to `pl`.
- Settings footer says "GIOŚ · Open-Meteo" but Open-Meteo isn't actually used — minor copy fix.
