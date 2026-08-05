# Mangasm domain language

## Community Reputation

Trust-oriented score (0–100) from verification, positive feedback, safety education, and helpful community care. **Not** a sexual or match-based level system. Synonym in UI: **Trust Score**.

## Trust Score

Deterministic formula components (verification ≤15, completeness ≤10, positive feedback ≤40, community ≤20, safety ≤10, penalties ≤30, mild inactivity decay ≤15). **No variable-ratio core** — predictable competence, not gambling.

## Profile Style

Cosmetic visual theme unlocked by Community Reputation. Users may switch among unlocked styles freely.

## Active Style

Resolved via `CommunityReputationStyle` façade: preferred if unlocked, else highest unlocked by score.

## Reputation Event

Allowlisted event kinds only (`verification_complete`, `positive_rating_received`, `helpful_report`, `safety_module_complete`, `clean_tenure_bonus`, `penalty_violation`, `inactivity_decay`). Never match_count / message_volume / sexual_activity.

## App Phase Machine

Finite shell states `launch` ↔ `app` with events `finishLaunchFlow`, `signOut`, `accountDeleted`. Illegal transitions are no-ops.
