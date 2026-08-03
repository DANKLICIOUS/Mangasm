package app.mangasm.android.auth

/**
 * Android authorization path (Google Play) — separate from iOS.
 *
 * Flow (planned):
 * 1. Google Sign-In → ID token
 * 2. Supabase Auth signInWithIdToken(provider = google, token = …)
 * 3. Session stored in encrypted prefs / Supabase client
 * 4. Optional: email/password for review demo account (Opal — password from secrets, never invent)
 *
 * Do NOT:
 * - Use Apple AuthKey .p8 or ASC API keys here
 * - Share iOS Keychain / App Group storage
 * - Gate features on sexual activity metrics
 *
 * See Android/AUTH-PATH.md for console steps.
 */
object AuthPath {
    const val PROVIDER_GOOGLE = "google"
    const val PROVIDER_EMAIL = "email"

    /** Planned Supabase Google provider name. */
    const val SUPABASE_GOOGLE_PROVIDER = "google"

    /**
     * Placeholder: validate package + SHA-1 are configured before enabling Google button.
     * Real check happens at runtime via Google Sign-In SDK status.
     */
    fun isGoogleConfiguredPlaceholder(): Boolean = false
}
