# SLAY.LLC Architecture & Product Decisions

## Overview
This document records architectural, product, design, and technical decisions made during the autonomous build of **SLAY.LLC** — the production Web3 meme creation and cryptocurrency market ecosystem.

---

### Decision 1: Application Architecture & Technology Stack
- **Framework**: React 18+ with TypeScript and Vite for ultra-fast HMR and bundle optimization.
- **Styling**: Tailwind CSS configured with SLAY custom tokens (Obsidian Black, Chrome, Electric Green, Turquoise, Iridescent gradients, Pastel accents) and glassmorphism utilities.
- **Motion & Visuals**: Pure CSS animations + interactive HTML5 Canvas particle/wave generators + accessible reduced-motion fallbacks.
- **Icons**: Lucide React for crisp, lightweight iconography.
- **State Management**: React Context + lightweight event/realtime pub-sub architecture for live market tickers and wallet connection states.

### Decision 2: Domain Model Separation
Following clean architecture principles, the domain model is strictly partitioned:
- `Gnomie`: Inhabitants, users, avatars, reputation tiers (Novice, Expert, Mentor, Top 1%), activity history.
- `Artifact`: The core primitive combining media, meme identity, ticker, description, creator info, 25SHA provenance, and MonetizeOS compatibility fields.
- `Market & Signals`: Live price, 24h change, volume, liquidity, transactions, holder count, volatility, Gnomie Vision informational interpretation layer.
- `Trade & Wallet`: Non-custodial wallet states, swap calculation with transparent fee breakdowns (liquidity provider, platform, network, slippage impact), order simulation.
- `Gnomie School`: Interactive educational modules with paper trading simulation.

### Decision 3: Gnomie Vision Compliance & Information Design
- GNOMIE VISION translates raw multidimensional market data (Price, Volume, Liquidity, Frequency, Volatility, Distribution, Buy/Sell ratio) into clear informational summaries.
- Strictly adheres to compliance rules: **NO financial guarantees, NO promises of profit, NO "to the moon" marketing**. All signals are labeled as informational analytics.

### Decision 4: Transparent Creator Economics
- The GROW workflow features progressive disclosure:
  1. Conception ("What are we growing?")
  2. Identity & Lore (Name, Ticker, Lore, Media, Social links)
  3. Market & Bonding Parameters (Initial liquidity pool, reserve ratio, curve model)
  4. Transparent Creator Economics & Fee Schedule (Creator fee share, platform fee, liquidity lock duration, protocol rules)
  5. Mandatory Risk Disclosures & Confirmation.
- Zero hidden fees. All protocol costs are explicitly itemized.

### Decision 5: Cinematic Portal & Progressive Reveal
- Hero experience utilizes the Ganesh cinematic portal concept with responsive video container and canvas-driven dynamic sacred geometry / ambient particle fallback when video is loading or unsupported.
- Progressive reveal sequence: Atmospheric void -> Ganesh portal -> Gnomie movement -> The Grove transition -> Live market discovery.

### Decision 6: 25SHA & MonetizeOS Compatibility
- Artifacts include a structured `provenance` metadata block supporting 25 stations, explicit receipt hashes, integrity audits, and verdict states (REPLENISH, COMPOST, ASCEND, QUARANTINE).
- Artifacts include extensible creator commercialization metadata (`monetizeOS`) for licensing and creator revenue participation without polluting the core market layer.
