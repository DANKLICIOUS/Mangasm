# App Store 4.3 Remediation — Corrected Submission Copy

**Status:** Option 4 (truth-fix the submission text) — DONE here; Option 1 (Events → primary tab) queued as code work.

**Rule for all copy below:** claim ONLY features verified to ship in the current build (recon 2026-08-02).
Do NOT reintroduce removed claims without code to back them.

## ⛔ Claims REMOVED (not in the shipping build — do not send)

- **Privacy-zone GPS fuzzing / "location deliberately fuzzed."** Privacy zones are cosmetic badges only;
  real location use passes raw coordinates (`LiveLocationProvider.swift`). No fuzzing exists.
- **"Tap pins to see people in real time."** No real-time location map ships; also contradicts the privacy framing.
- **REP "gates access across the app."** Reputation service is mock-backed; only a single photo-unlock
  gate (REP ≥ 50) actually ships. Claim that one behavior, not app-wide gating.
- **Astrology / numerology / Chinese-zodiac matchmaking.** UNVERIFIED in code (an "AI Match" tab exists but the
  blend was not confirmed). Excluded until verified. If you confirm it ships, it can be added back.

## ✅ Verified shipping differentiators (safe to claim)

1. **Member-hosted real-world events with a defined taxonomy** — Circle / Open Door / Social Mixer
   (`Models/Models.swift`). Hosts create events; attendees RSVP.
2. **Host-approval address gating** — an event's exact address is hidden until the host individually
   approves each attendee (`HostEventForm.swift`, `HostPrivacy.approval` "Address hidden until you approve").
3. **Reputation-gated profile photos** — photos unlock at REP score ≥ 50 (`ProfileScreen.swift` `canViewPhotos`).
4. **Safety-first onboarding & moderation** — 18+ age gate + terms accepted at first launch
   (`OnboardingConsent`, `consent_log`); Block + Report on profiles and messages; full in-app account
   deletion with real data erasure (`delete-account` edge fn); published support contact (support@mangasm.app).

---

## DROP-IN 1 — App Store description opener + metadata (corrected)

**Primary category:** Social Networking · **Secondary:** Lifestyle
**Feature names must match the UI exactly:** Circle, Open Door, Social Mixer.

**Description opener (lead with events + community, not "dating"):**

> Mangasm is a member-hosted events and community app for LGBTQ+ people. Host and join real-world
> micro-gatherings — Circles, Open Doors, and Social Mixers — where the exact address stays private
> until the host approves you. Build a reputation in the community, unlock more as you become a trusted
> member, and meet people through shared events rather than an endless swipe grid.

**First screenshot:** a Circle event with the host-approval / "address hidden until approved" state
(NOT a profile grid, splash, or login screen — Guideline 2.3.3).

---

## DROP-IN 2 — Resolution Center reply (corrected; claims only shipping features)

Hello, and thank you for the review.

We'd like to clarify Mangasm's concept, as we believe it was read as a generic dating app in a saturated
category. Mangasm is a member-hosted, real-world events and community app for the LGBTQ+ community. Meeting
people happens through shared events, and the experience is built around three features that ship in this build:

1. **Host-approved real-world events with a defined taxonomy.** Members host and RSVP to micro-events typed
   as Circle, Open Door, and Social Mixer. An event's exact address is hidden by default and is revealed only
   after the host individually approves each attendee.
2. **Reputation-gated profile photos.** Members earn a reputation score in the community; profile photos
   unlock once a viewer reaches a reputation threshold, so access is earned rather than universal.
3. **Safety-first design.** An 18+ age gate and zero-tolerance terms are accepted at first launch; members can
   block and report other members and messages; and full in-app account deletion permanently erases user data.

To let you verify this quickly, we have provided a pre-seeded demo account with a high reputation score so that
reputation-locked photos and an approved event address are visible immediately on first login. Credentials and
step-by-step instructions are in the App Review Information notes, and a short demo video is here: [PUBLIC_VIDEO_URL].

We have also updated our App Store metadata and screenshots to lead with the events and community experience,
and aligned all feature names in the listing with the exact names used in the app.

If any specific screen still reads as duplicative, we'd be grateful if you could identify it so we can address it
precisely. We're also happy to schedule an App Review appointment. Thank you for your time.

---

## Next (code)

- **Option 1:** promote Events from a Discover sub-tab to a primary TabView tab; land first-run in Events.
- **Compliance:** SIWA token revoke on account delete (5.1.1(v)); report control on events + photos.
- **On its own timeline (not for a claim):** real privacy-zone coordinate fuzzing; live REP service.
- **Verify before re-claiming:** whether AI Match actually blends astrology/numerology/zodiac.
