package app.mangasm.android.ui.theme

/**
 * Parity with iOS ProfileStyleCatalog — cosmetic Community Reputation styles only.
 * Thresholds and badge names must stay aligned with the Swift catalog for product consistency.
 */
enum class ProfileStyleId {
    CALM_STUDIO,
    ASPIRATIONAL,
    PRECISION_TECH,
    DIGITAL_FLOW,
    BOLD_EXPRESSION,
}

data class ProfileStyleConfig(
    val id: ProfileStyleId,
    val minScore: Int,
    val badgeName: String,
    val displayName: String,
)

object ProfileStyleCatalog {
    val all: List<ProfileStyleConfig> = listOf(
        ProfileStyleConfig(ProfileStyleId.CALM_STUDIO, 0, "New Member", "Calm Studio"),
        ProfileStyleConfig(ProfileStyleId.ASPIRATIONAL, 21, "Rising Member", "Aspirational"),
        ProfileStyleConfig(ProfileStyleId.PRECISION_TECH, 41, "Trusted Member", "Precision Tech"),
        ProfileStyleConfig(ProfileStyleId.DIGITAL_FLOW, 61, "Community Leader", "Digital Flow"),
        ProfileStyleConfig(ProfileStyleId.BOLD_EXPRESSION, 81, "Elite Verified", "Bold Expression"),
    )

    fun clampScore(score: Int): Int = score.coerceIn(0, 100)

    fun available(score: Int): List<ProfileStyleConfig> {
        val s = clampScore(score)
        return all.filter { s >= it.minScore }
    }

    fun defaultStyle(score: Int): ProfileStyleConfig =
        available(score).lastOrNull() ?: all.first()

    const val COMMUNITY_REPUTATION_EXPLAINER =
        "Community Reputation grows when you complete verification, receive positive feedback, " +
            "finish safety education, and help keep Mangasm safe. Higher reputation unlocks " +
            "cosmetic profile styles only — never messages, adult visibility, or sexual features."
}
