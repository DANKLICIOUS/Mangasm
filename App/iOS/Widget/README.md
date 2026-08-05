# Mangasm iOS Widget — Community Reputation

**Bundle ID (planned):** `com.mangasm.app.widget`  
**Source:** `MangasmReputationWidget.swift`  
**App Group (planned):** `group.com.mangasm.app`

## What it shows

- Community Reputation score
- Badge name (New Member … Elite Verified)
- Active cosmetic style display name

**Cosmetic only** — no chat, no adult content, no gamified sexual metrics.

## Enable in Xcode / xcodegen

1. Add a **Widget Extension** target `MangasmWidget` pointing at `App/iOS/Widget/`.
2. Set bundle id `com.mangasm.app.widget`, team `854XZ2543V`.
3. Enable **App Groups** on both app + widget: `group.com.mangasm.app`.
4. From the main app, write:

```swift
if let d = UserDefaults(suiteName: "group.com.mangasm.app") {
  d.set(profile.repScore, forKey: "mangasm.widget.repScore")
  d.set(profileStyle.activeConfig.styleId.rawValue, forKey: "mangasm.widget.styleId")
}
WidgetCenter.shared.reloadTimelines(ofKind: "MangasmReputationWidget")
```

5. Optional: ship small hero thumbs from `App/iOS/Widget/Assets/`.

## Privacy

Widget data is the user’s own reputation score and style preference only — no third-party content.
