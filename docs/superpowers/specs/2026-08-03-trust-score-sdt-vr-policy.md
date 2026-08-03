# Trust Score — SDT, Variable-Ratio policy, formula

## Variable-ratio (VR) policy

**Core Trust Score: no pure VR.** Score changes are deterministic and auditable so users feel competence (Self-Determination Theory), not gambling.

**Allowed:** optional light delight (one-shot cosmetic animations) that does **not** change score or unlocks.

**Forbidden for score:** slot-machine-like reward after unpredictable N actions; loot-box reputation; opaque match-based XP.

## Self-Determination Theory logistics

| Need        | Support in product                                                         |
| ----------- | -------------------------------------------------------------------------- |
| Autonomy    | Free switch among unlocked styles; How Trust works screen; no forced theme |
| Competence  | Component caps, progress to next style, event explanations                 |
| Relatedness | Positive ratings, upheld reports, community framing of badges              |

## Formula (summary)

```
TrustScore = clamp(0,100,
  BaseVerification(≤15)
+ ProfileCompleteness(≤10)
+ PositiveFeedback(≤40)
+ CommunityContribution(≤20)
+ SafetyActions(≤10)
– Penalties(≤30)
– InactivityDecay(≤15)
)
```

Implemented as pure Swift: `TrustScoreFormula` + `ReputationEvent`.

## Theme unlock thresholds (unchanged)

0 / 21 / 41 / 61 / 81 → cosmetic styles only.
