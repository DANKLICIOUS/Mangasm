# Mangasm iOS Widget — Community Reputation

**Bundle ID:** `com.mangasm.app.widget`  
**Source:** `MangasmReputationWidget.swift`  
**App Group:** `group.com.mangasm.app`  
**Target:** `MangasmWidget` in `project.yml`, embedded in the Mangasm app.

## What it shows

- Community Reputation score
- Badge name (New Member … Elite Verified)
- Active cosmetic style display name

**Cosmetic only** — no chat, no adult content, no gamified sexual metrics.

## Ship

The extension target is already in `project.yml` and `MangasmiOS.xcodeproj`. App Groups are on both the app and the widget.

Before `scripts/archive-build.sh` can upload, create an App Store provisioning profile named **Mangasm Widget App Store** for `com.mangasm.app.widget` (team `854XZ2543V`). `ExportOptions.plist` expects that name. This machine has no Xcode, no distribution certificate, and no `App/iOS/Secrets.xcconfig`, so the archive itself has to run on the signing machine.

The app writes the score from `AppState.syncWidgetBridge()` and reloads the timeline:

```swift
if let d = UserDefaults(suiteName: "group.com.mangasm.app") {
  d.set(profile.repScore, forKey: "mangasm.widget.repScore")
  d.set(profileStyle.activeConfig.styleId.rawValue, forKey: "mangasm.widget.styleId")
}
WidgetCenter.shared.reloadTimelines(ofKind: "MangasmReputationWidget")
```

Optional: ship small hero thumbs from `App/iOS/Widget/Assets/`.

## Privacy

Widget data is the user’s own reputation score and style preference only — no third-party content.
