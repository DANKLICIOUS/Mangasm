/**
 * slay.llc Void Market / The Grove — Appwrite resource IDs.
 * Mirrors appwrite/slay/appwrite.config.json. Client apps read
 * APPWRITE_ENDPOINT + APPWRITE_PROJECT_ID from env; never bake API keys here.
 */

export const SLAY_APPWRITE = {
  product: "slay.llc Void Market / The Grove",
  projectIdEnv: "APPWRITE_PROJECT_ID",
  endpointEnv: "APPWRITE_ENDPOINT",
  databaseId: "grove",
  tables: {
    gnomies: "gnomies",
    artifacts: "artifacts",
    markets: "markets",
    trades: "trades",
    signals: "signals",
    comments: "comments",
    reputation: "reputation",
    learningProgress: "learning_progress",
    creatorEconomics: "creator_economics",
  },
  buckets: {
    artifactMedia: "artifact-media",
    gnomieAvatars: "gnomie-avatars",
  },
  functions: {
    growArtifact: "grow-artifact",
    gnomie: "gnomie",
    market: "market",
    trade: "trade",
    signal: "signal",
  },
  sites: {
    theGrove: "the-grove",
  },
  teams: {
    groveCurators: "grove-curators",
    gnomieMentors: "gnomie-mentors",
  },
  topics: {
    groveActivity: "grove-activity",
    gnomieSchool: "gnomie-school",
  },
} as const;

export const SLAY_DISCLAIMERS = {
  noGuaranteedReturns:
    "Gnomie Vision and GROW record informational market activity. Nothing here is a return guarantee or financial advice.",
  provenanceAdapterOnly:
    "25SHA / provenance fields are adapter metadata only. They are not a cryptographic guarantee of authenticity or custody.",
  growNotForge:
    "GROW creates Artifacts. There is no FORGE primitive and no NFT-collection marketplace.",
} as const;
