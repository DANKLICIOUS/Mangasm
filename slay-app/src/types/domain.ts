// Domain Models for SLAY.LLC Ecosystem

export type GnomieReputationTier = 'NOVICE' | 'EXPERT' | 'MENTOR' | 'TOP_1_PERCENT';

export interface GnomieUser {
  id: string; // e.g., "GNOMIE #48291"
  handle: string;
  avatarUrl: string;
  avatarSeed: string; // For dynamic procedural avatar synthesis
  joinedDate: string; // e.g., "September 2026"
  tier: GnomieReputationTier;
  reputationScore: number; // 0-1000 trust & participation score
  signals: {
    learningProgress: number; // 0-100%
    artifactsGrown: number;
    tradesExecuted: number;
    mentorshipHelps: number;
    communityContributions: number;
    tenureDays: number;
  };
  badges: string[];
}

export type MarketTrend = 'STABLE' | 'ACCELERATING' | 'VOLATILE' | 'CONSOLIDATING';

export interface MarketSignal {
  dimension: 'PRICE' | 'VOLUME' | 'LIQUIDITY' | 'TRANSACTION_FREQUENCY' | 'VOLATILITY' | 'HOLDER_DISTRIBUTION' | 'BUY_SELL_RATIO' | 'AGE';
  label: string;
  observation: string;
  intensity: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  score: number; // 0 - 100
}

export interface CreatorEconomics {
  creatorRewardSharePct: number; // e.g. 1.0% of volume
  platformFeePct: number; // e.g. 0.3%
  networkGasEstSol: number; // e.g. 0.00005 SOL
  liquidityLockedPct: number; // e.g. 98%
  bondingCurveType: 'LINEAR' | 'EXPONENTIAL' | 'SIGMOID_MIGRATION';
  migrationTargetMarketCap: number; // e.g. 69000 USD
  disclaimer: string;
}

export interface ProvenanceReceipt {
  station: number; // 1 to 25 (25SHA standard)
  name: string;
  status: 'REPLENISH' | 'COMPOST' | 'ASCEND' | 'QUARANTINE' | 'VERIFIED';
  hash: string;
  timestamp: string;
  operator: string;
}

export interface Artifact {
  id: string;
  name: string;
  ticker: string; // e.g. "$VOID"
  tagline: string;
  description: string;
  lore: string;
  media: {
    type: 'IMAGE' | 'VIDEO' | 'INTERACTIVE_CANVAS';
    url: string;
    posterUrl?: string;
    ambientColor: string;
  };
  creator: {
    id: string;
    name: string;
    tier: GnomieReputationTier;
    avatarUrl: string;
  };
  socials: {
    x?: string;
    telegram?: string;
    website?: string;
    discord?: string;
  };
  token: {
    contractAddress: string;
    chain: 'SOLANA' | 'ETHEREUM' | 'BASE';
    totalSupply: number;
    decimals: number;
  };
  market: {
    priceUsd: number;
    priceNative: number; // SOL / ETH
    priceChange24h: number;
    marketCapUsd: number;
    liquidityUsd: number;
    volume24hUsd: number;
    transactions24h: number;
    holdersCount: number;
    buyCount24h: number;
    sellCount24h: number;
    volatilityScore: number; // 0 - 100
    ageDays: number;
    bondingProgressPct: number; // 0 - 100% towards DEX migration
  };
  signals: MarketSignal[];
  visionSummary: string; // Plain English observation
  economics: CreatorEconomics;
  provenance: ProvenanceReceipt[];
  monetizeOS: {
    commercialStatus: 'ACTIVE_COMMUNITY_MARKET' | 'INCUBATING' | 'GRADUATED';
    derivativeRightsAllowed: boolean;
    licensingTerms: string;
  };
  comments: Array<{
    id: string;
    gnomieId: string;
    author: string;
    tier: GnomieReputationTier;
    text: string;
    timestamp: string;
  }>;
}

export type WalletConnectionStatus = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SIGNATURE_REQUIRED'
  | 'TRANSACTION_SUBMITTED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'FAILED';

export interface WalletState {
  status: WalletConnectionStatus;
  address: string | null;
  balanceSol: number;
  balanceUsd: number;
  gnomieProfile: GnomieUser | null;
  error?: string;
}

export interface TradeOrderRequest {
  artifactId: string;
  type: 'BUY' | 'SELL';
  amountIn: number;
  slippageTolerancePct: number;
}

export interface TradeOrderSimulation {
  estimatedOutput: number;
  priceImpactPct: number;
  minimumReceived: number;
  creatorFeeUsd: number;
  platformFeeUsd: number;
  networkGasSol: number;
  executionRoute: string;
}

export interface SchoolLesson {
  id: string;
  title: string;
  slug: string;
  category: 'FOUNDATIONS' | 'MARKETS' | 'RISK_MANAGEMENT' | 'GNOMIE_LORE';
  readTimeMin: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  summary: string;
  interactiveSimType?: 'BONDING_CURVE' | 'SLIPPAGE_CALCULATOR' | 'PAPER_TRADE';
  content: string[];
  keyTakeaway: string;
  riskWarning?: string;
}
