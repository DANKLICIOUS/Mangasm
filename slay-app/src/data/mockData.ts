import { Artifact, GnomieUser, SchoolLesson } from '../types/domain';

export const INITIAL_GNOMIE_USER: GnomieUser = {
  id: 'GNOMIE #48291',
  handle: '@void_wanderer',
  avatarUrl: '',
  avatarSeed: 'seed-gnomie-48291',
  joinedDate: 'September 2026',
  tier: 'EXPERT',
  reputationScore: 780,
  signals: {
    learningProgress: 88,
    artifactsGrown: 3,
    tradesExecuted: 27,
    mentorshipHelps: 14,
    communityContributions: 42,
    tenureDays: 140,
  },
  badges: ['Grove Pioneer', 'Root Curator', 'Master of Volatility', 'Signal Interpreter']
};

export const INITIAL_ARTIFACTS: Artifact[] = [
  {
    id: 'void-gnome-01',
    name: 'The Void Gnome',
    ticker: '$VOID',
    tagline: 'When the signal vanishes into the moss, the void speaks.',
    description: 'The ancient guardian of the deep underground Grove. Originating in the zero-liquidity depths of the forgotten mycelial network, $VOID marks the Genesis Artifact of the Gnomie civilization.',
    lore: 'Discovered under an ancient bioluminescent stone in the outer perimeter of the Sacred Loop. Legend says every transaction feeds the sacred root system, converting fleeting memes into perpetual market gravity.',
    media: {
      type: 'INTERACTIVE_CANVAS',
      url: '/assets/void-gnome.png',
      ambientColor: '#00FF66'
    },
    creator: {
      id: 'GNOMIE #19382',
      name: 'Elder Spore',
      tier: 'TOP_1_PERCENT',
      avatarUrl: '',
    },
    socials: {
      x: 'https://x.com/slay_void',
      telegram: 'https://t.me/slay_void',
      website: 'https://slay.llc',
      discord: 'https://discord.gg/slay'
    },
    token: {
      contractAddress: '7XwK...4pQ9_SLAY_VOID',
      chain: 'SOLANA',
      totalSupply: 1_000_000_000,
      decimals: 9,
    },
    market: {
      priceUsd: 0.00084,
      priceNative: 0.0000056,
      priceChange24h: 18.4,
      marketCapUsd: 840000,
      liquidityUsd: 215000,
      volume24hUsd: 489200,
      transactions24h: 3120,
      holdersCount: 4280,
      buyCount24h: 1940,
      sellCount24h: 1180,
      volatilityScore: 64,
      ageDays: 19,
      bondingProgressPct: 92,
    },
    signals: [
      {
        dimension: 'TRANSACTION_FREQUENCY',
        label: 'Elevated Velocity',
        observation: 'Transaction frequency is elevated over the 4-hour moving window.',
        intensity: 'ELEVATED',
        score: 82
      },
      {
        dimension: 'LIQUIDITY',
        label: 'Deep Root Pool',
        observation: 'Liquidity pool depth is resilient relative to 24-hour volume.',
        intensity: 'HIGH',
        score: 79
      },
      {
        dimension: 'BUY_SELL_RATIO',
        label: 'Net Inflow Bias',
        observation: 'Observed buy transactions exceed sell volume by 1.64x.',
        intensity: 'MODERATE',
        score: 68
      },
      {
        dimension: 'HOLDER_DISTRIBUTION',
        label: 'Decentralized Spores',
        observation: 'Top 10 holders account for less than 12% of circulating supply.',
        intensity: 'HIGH',
        score: 88
      }
    ],
    visionSummary: 'High transaction frequency with healthy organic holder distribution. Market depth is entering final bonding migration band.',
    economics: {
      creatorRewardSharePct: 1.0,
      platformFeePct: 0.3,
      networkGasEstSol: 0.00005,
      liquidityLockedPct: 99.5,
      bondingCurveType: 'SIGMOID_MIGRATION',
      migrationTargetMarketCap: 1000000,
      disclaimer: 'Creator rewards are programmatic distribution shares from protocol transaction activity, not guaranteed investment returns.'
    },
    provenance: [
      { station: 1, name: 'Conception Seed', status: 'VERIFIED', hash: 'sha256_e82a...91f0', timestamp: '2026-09-08 04:12 UTC', operator: 'Gnomie #19382' },
      { station: 7, name: 'Mycelium Review', status: 'ASCEND', hash: 'sha256_44b1...2c8e', timestamp: '2026-09-08 09:30 UTC', operator: 'Sacred Loop Validator 4' },
      { station: 14, name: 'Bonding Ignition', status: 'VERIFIED', hash: 'sha256_9f31...a011', timestamp: '2026-09-08 11:00 UTC', operator: 'SLAY Curve Engine' },
      { station: 25, name: 'Live Grove Station', status: 'REPLENISH', hash: 'sha256_d103...7b42', timestamp: '2026-09-27 03:00 UTC', operator: 'Automated Grove Node' }
    ],
    monetizeOS: {
      commercialStatus: 'ACTIVE_COMMUNITY_MARKET',
      derivativeRightsAllowed: true,
      licensingTerms: 'Community open-derivatives with automated 0.5% attribution split to Genesis Seed.'
    },
    comments: [
      { id: 'c1', gnomieId: 'GNOMIE #8129', author: 'MossyBeard', tier: 'MENTOR', text: 'The liquidity cushion on this curve is remarkably smooth compared to standard pump mechanics.', timestamp: '12m ago' },
      { id: 'c2', gnomieId: 'GNOMIE #3104', author: 'CyberSpore', tier: 'EXPERT', text: 'Gnomie Vision signal for holder distribution just crossed 88. Very clean curve spread.', timestamp: '45m ago' }
    ]
  },
  {
    id: 'psychedelic-spore-02',
    name: 'Psychedelic Spore',
    ticker: '$SPORE',
    tagline: 'Multiply under twilight. Trade under dawn.',
    description: 'An iridescent bioluminescent fungus that blooms only during high trading volatility. Known across the Grove for sudden nocturnal surges.',
    lore: 'Harvested from the damp roots beneath the Ganesh gateway. Gnomies utilize $SPORE to brew clarity potions during tumultuous market cycles.',
    media: {
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1546853020-ca4909aef454?auto=format&fit=crop&w=800&q=80',
      ambientColor: '#FF3B81'
    },
    creator: {
      id: 'GNOMIE #54190',
      name: 'Fungal Alchemist',
      tier: 'EXPERT',
      avatarUrl: '',
    },
    socials: {
      x: 'https://x.com/spore_gnomies',
      telegram: 'https://t.me/spore_grove'
    },
    token: {
      contractAddress: '9PoL...1mZ4_SLAY_SPORE',
      chain: 'SOLANA',
      totalSupply: 500_000_000,
      decimals: 9,
    },
    market: {
      priceUsd: 0.00312,
      priceNative: 0.000021,
      priceChange24h: 42.1,
      marketCapUsd: 1560000,
      liquidityUsd: 380000,
      volume24hUsd: 920400,
      transactions24h: 5840,
      holdersCount: 6190,
      buyCount24h: 3420,
      sellCount24h: 2420,
      volatilityScore: 78,
      ageDays: 11,
      bondingProgressPct: 100, // Migrated to DEX!
    },
    signals: [
      {
        dimension: 'VOLATILITY',
        label: 'High Price Oscillation',
        observation: 'Rapid intra-hour price variance detected with substantial trading volume.',
        intensity: 'HIGH',
        score: 84
      },
      {
        dimension: 'VOLUME',
        label: 'Surge Momentum',
        observation: '24-hour trading turnover exceeded 60% of total market capitalization.',
        intensity: 'ELEVATED',
        score: 86
      }
    ],
    visionSummary: 'High momentum asset post-DEX migration. Elevated volatility observed across secondary liquidity pools.',
    economics: {
      creatorRewardSharePct: 1.2,
      platformFeePct: 0.3,
      networkGasEstSol: 0.00005,
      liquidityLockedPct: 100,
      bondingCurveType: 'EXPONENTIAL',
      migrationTargetMarketCap: 1500000,
      disclaimer: 'High volatility asset. Price may experience sharp drawdowns.'
    },
    provenance: [
      { station: 1, name: 'Conception Seed', status: 'VERIFIED', hash: 'sha256_a1b2...3c4d', timestamp: '2026-09-16 12:00 UTC', operator: 'Gnomie #54190' },
      { station: 25, name: 'DEX Graduation Station', status: 'ASCEND', hash: 'sha256_5e6f...7g8h', timestamp: '2026-09-24 18:30 UTC', operator: 'Raydium Migration Router' }
    ],
    monetizeOS: {
      commercialStatus: 'GRADUATED',
      derivativeRightsAllowed: true,
      licensingTerms: 'Commercial apparel and digital media rights granted to holders with >100,000 $SPORE.'
    },
    comments: [
      { id: 'c3', gnomieId: 'GNOMIE #9941', author: 'MoonCap', tier: 'NOVICE', text: 'The visual signals on Gnomie Vision helped me spot the volume expansion yesterday.', timestamp: '3h ago' }
    ]
  },
  {
    id: 'cyber-cap-03',
    name: 'CyberCap Chrome',
    ticker: '$CHROME',
    tagline: 'Metallic moss synthesized at 4.2 GHz.',
    description: 'An advanced metallic Gnomie hat forged in liquid chrome. Bridges raw meme velocity with precision algorithmic signals.',
    lore: 'Crafted when a lightning strike hit the central server rack in the heart of the ancient forest. It shines with obsidian and mirror reflections.',
    media: {
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      ambientColor: '#22D3EE'
    },
    creator: {
      id: 'GNOMIE #90210',
      name: 'CyberDruid',
      tier: 'MENTOR',
      avatarUrl: '',
    },
    socials: {
      x: 'https://x.com/cybercap_slay',
      discord: 'https://discord.gg/slay'
    },
    token: {
      contractAddress: '5Kk7...8vL1_SLAY_CHRM',
      chain: 'SOLANA',
      totalSupply: 100_000_000,
      decimals: 9,
    },
    market: {
      priceUsd: 0.0142,
      priceNative: 0.000095,
      priceChange24h: -3.8,
      marketCapUsd: 1420000,
      liquidityUsd: 410000,
      volume24hUsd: 184000,
      transactions24h: 1240,
      holdersCount: 2890,
      buyCount24h: 580,
      sellCount24h: 660,
      volatilityScore: 32,
      ageDays: 34,
      bondingProgressPct: 100,
    },
    signals: [
      {
        dimension: 'PRICE',
        label: 'Consolidation Corridor',
        observation: 'Price moving sideways within tight 4.5% standard deviation band.',
        intensity: 'LOW',
        score: 35
      },
      {
        dimension: 'LIQUIDITY',
        label: 'Stable Floor',
        observation: 'Liquidity to market cap ratio is at an institutional tier of 28.8%.',
        intensity: 'HIGH',
        score: 91
      }
    ],
    visionSummary: 'Stable consolidation regime. High liquidity ratio buffering daily price swings.',
    economics: {
      creatorRewardSharePct: 0.8,
      platformFeePct: 0.3,
      networkGasEstSol: 0.00005,
      liquidityLockedPct: 99.0,
      bondingCurveType: 'LINEAR',
      migrationTargetMarketCap: 1000000,
      disclaimer: 'Past stability does not preclude future price fluctuations.'
    },
    provenance: [
      { station: 1, name: 'Conception Seed', status: 'VERIFIED', hash: 'sha256_cc11...00aa', timestamp: '2026-08-24 10:00 UTC', operator: 'Gnomie #90210' }
    ],
    monetizeOS: {
      commercialStatus: 'GRADUATED',
      derivativeRightsAllowed: true,
      licensingTerms: 'Open source CC0 art with token-gated creator royalties.'
    },
    comments: []
  },
  {
    id: 'moss-whisperer-04',
    name: 'Moss Whisperer',
    ticker: '$MOSS',
    tagline: 'Quiet growth makes the tallest trees.',
    description: 'A gentle, organic ecosystem token where community members contribute botanical lore and earn micro-rewards from trading activity.',
    lore: 'The whisperers sleep beneath the bark of the world tree, waking only to record the honest history of each meme spawned in the Grove.',
    media: {
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      ambientColor: '#A7F3D0'
    },
    creator: {
      id: 'GNOMIE #11409',
      name: 'Forest Warden',
      tier: 'EXPERT',
      avatarUrl: '',
    },
    socials: {
      x: 'https://x.com/moss_whisper'
    },
    token: {
      contractAddress: '3Tt8...4mX9_SLAY_MOSS',
      chain: 'SOLANA',
      totalSupply: 2_000_000_000,
      decimals: 9,
    },
    market: {
      priceUsd: 0.00018,
      priceNative: 0.0000012,
      priceChange24h: 8.9,
      marketCapUsd: 360000,
      liquidityUsd: 94000,
      volume24hUsd: 112000,
      transactions24h: 890,
      holdersCount: 1540,
      buyCount24h: 530,
      sellCount24h: 360,
      volatilityScore: 41,
      ageDays: 5,
      bondingProgressPct: 54,
    },
    signals: [
      {
        dimension: 'AGE',
        label: 'Early Growth Stage',
        observation: 'Artifact is 5 days old, currently 54% through bonding curve trajectory.',
        intensity: 'MODERATE',
        score: 54
      }
    ],
    visionSummary: 'Steady early-stage bonding progress with balanced buy/sell distribution.',
    economics: {
      creatorRewardSharePct: 1.0,
      platformFeePct: 0.3,
      networkGasEstSol: 0.00005,
      liquidityLockedPct: 98.0,
      bondingCurveType: 'SIGMOID_MIGRATION',
      migrationTargetMarketCap: 690000,
      disclaimer: 'Early-stage bonding curve asset. Subject to curve slippage.'
    },
    provenance: [
      { station: 1, name: 'Conception Seed', status: 'VERIFIED', hash: 'sha256_moss...1122', timestamp: '2026-09-22 14:00 UTC', operator: 'Gnomie #11409' }
    ],
    monetizeOS: {
      commercialStatus: 'INCUBATING',
      derivativeRightsAllowed: false,
      licensingTerms: 'Reserved by creator until bonding migration completion.'
    },
    comments: []
  }
];

export const SCHOOL_LESSONS: SchoolLesson[] = [
  {
    id: 'lesson-01',
    title: 'What is an Artifact vs. a Static NFT?',
    slug: 'artifact-vs-nft',
    category: 'FOUNDATIONS',
    readTimeMin: 3,
    difficulty: 'BEGINNER',
    summary: 'Why SLAY treats memes as living cryptocurrency markets rather than static JPEG collectibles.',
    content: [
      'In traditional Web3 marketplaces, digital collectibles are often static images stored on a decentralized hash table with low liquidity and discontinuous order books.',
      'An Artifact in SLAY is different: it is an inseparable union of a meme identity, media, lore, and an automated continuous liquidity market (token).',
      'The market is the living heartbeat of the Artifact. When community interest expands, price discovery happens smoothly on a bonding curve rather than waiting for an illiquid auction bid.'
    ],
    keyTakeaway: 'Artifacts combine cultural narrative and instant programmatic liquidity into one living entity.'
  },
  {
    id: 'lesson-02',
    title: 'How Bonding Curves Work & Price Discovery',
    slug: 'bonding-curves-explained',
    category: 'MARKETS',
    readTimeMin: 4,
    difficulty: 'BEGINNER',
    summary: 'Understand the mathematical formula that prices tokens continuously without requiring an external market maker.',
    interactiveSimType: 'BONDING_CURVE',
    content: [
      'A bonding curve is a mathematical smart contract that buys and sells tokens according to a deterministic formula (e.g. Price = k * Supply^n).',
      'When you BUY, new tokens are minted and the price moves incrementally up along the curve.',
      'When you SELL, tokens are burned and reserve assets (SOL) are returned to you as the price steps down.',
      'Once an Artifact reaches its target market cap threshold, liquidity is permanently migrated to decentralized exchanges like Raydium/Orca.'
    ],
    keyTakeaway: 'Bonding curves eliminate zero-liquidity deadlocks by guaranteeing a counterparty for every trade.'
  },
  {
    id: 'lesson-03',
    title: 'Slippage, Price Impact & Transparent Fees',
    slug: 'slippage-and-fees',
    category: 'RISK_MANAGEMENT',
    readTimeMin: 4,
    difficulty: 'INTERMEDIATE',
    summary: 'How trade size affects execution price, and why transparent fee accounting matters.',
    interactiveSimType: 'SLIPPAGE_CALCULATOR',
    content: [
      'Price impact is the difference between the current spot market price and the actual average execution price of your order.',
      'If you place a large buy order in a shallow liquidity pool, your order pushes the price up during execution.',
      'Slippage tolerance protects you: if another trader front-runs your transaction and the price shifts beyond your tolerance (e.g., 1%), your trade automatically reverts to protect your funds.',
      'SLAY itemizes every fee: Creator reward (1%), Platform maintenance (0.3%), and exact Solana network gas (~0.00005 SOL).'
    ],
    keyTakeaway: 'Always check price impact before confirming large swaps, and never trade without slippage protection.',
    riskWarning: 'Setting slippage too high (>5%) exposes your transaction to MEV sandwich bots.'
  },
  {
    id: 'lesson-04',
    title: 'Gnomie Vision: Reading Market Signals Without the Hype',
    slug: 'gnomie-vision-signals',
    category: 'GNOMIE_LORE',
    readTimeMin: 3,
    difficulty: 'BEGINNER',
    summary: 'How to interpret multi-dimensional market signals as observable facts rather than financial advice.',
    content: [
      'Markets are complex living organisms. Gnomie Vision breaks down market activity into measurable dimensions: Volume, Velocity, Liquidity Depth, Volatility, and Holder Distribution.',
      'A signal of "High Volatility" simply reports that price variance is elevated—it does NOT mean the token is guaranteed to rise.',
      'A healthy Artifact typically displays high holder decentralization, stable liquidity depth, and organic transaction frequency.'
    ],
    keyTakeaway: 'Data is information, not a guarantee. Use Gnomie Vision to verify real on-chain health.'
  }
];
