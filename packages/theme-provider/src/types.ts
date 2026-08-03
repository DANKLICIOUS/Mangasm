/**
 * Cross-platform theme IDs (RN aliases).
 * Swift iOS maps: bobRoss→calmStudio, lambo→aspirational, cyborg→precisionTech,
 * matrix→digitalFlow, gothGlam→boldExpression.
 */
export type ThemeId = "bobRoss" | "lambo" | "cyborg" | "matrix" | "gothGlam";

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  success: string;
  headerGradient: string[];
}

export interface AppTheme {
  id: ThemeId;
  /** Swift ProfileStyleId raw value */
  swiftId: string;
  name: string;
  badgeName: string;
  minScore: number;
  colors: ThemeColors;
  borderRadius: number;
  shadowOpacity: number;
  badgeSymbol: string;
  badgeMeaning: string;
}

export const THEMES: Record<ThemeId, AppTheme> = {
  bobRoss: {
    id: "bobRoss",
    swiftId: "calmStudio",
    name: "Calm Studio",
    badgeName: "New Member",
    minScore: 0,
    borderRadius: 16,
    shadowOpacity: 0.08,
    badgeSymbol: "leaf",
    badgeMeaning: "Just joined and completed basic profile setup.",
    colors: {
      primary: "#5B8C5A",
      secondary: "#A8C3A0",
      background: "#F7F4EF",
      surface: "#FFFFFF",
      text: "#2C3E2D",
      textSecondary: "#6B7C6A",
      accent: "#E8D5B7",
      border: "#D4C8B0",
      success: "#7BA05B",
      headerGradient: ["#A8C3A0", "#5B8C5A"],
    },
  },
  lambo: {
    id: "lambo",
    swiftId: "aspirational",
    name: "Aspirational",
    badgeName: "Rising Member",
    minScore: 21,
    borderRadius: 14,
    shadowOpacity: 0.15,
    badgeSymbol: "arrow-up-right",
    badgeMeaning: "Building positive reputation through consistent, respectful activity.",
    colors: {
      primary: "#0A5C36",
      secondary: "#C9A227",
      background: "#0F1410",
      surface: "#1A221C",
      text: "#F5F5F0",
      textSecondary: "#A0A89A",
      accent: "#C9A227",
      border: "#2A332C",
      success: "#2E8B57",
      headerGradient: ["#0A5C36", "#C9A227"],
    },
  },
  cyborg: {
    id: "cyborg",
    swiftId: "precisionTech",
    name: "Precision Tech",
    badgeName: "Trusted Member",
    minScore: 41,
    borderRadius: 10,
    shadowOpacity: 0.25,
    badgeSymbol: "shield-check",
    badgeMeaning: "Verified identity and strong positive community feedback.",
    colors: {
      primary: "#00D4FF",
      secondary: "#7B8C9E",
      background: "#0A0E14",
      surface: "#141A22",
      text: "#E8F0F7",
      textSecondary: "#8A9BAA",
      accent: "#00D4FF",
      border: "#1E2A38",
      success: "#00C2A0",
      headerGradient: ["#0A0E14", "#00D4FF"],
    },
  },
  matrix: {
    id: "matrix",
    swiftId: "digitalFlow",
    name: "Digital Flow",
    badgeName: "Community Leader",
    minScore: 61,
    borderRadius: 8,
    shadowOpacity: 0.3,
    badgeSymbol: "network",
    badgeMeaning: "Actively helps keep the community safe and supportive.",
    colors: {
      primary: "#00FF41",
      secondary: "#003B00",
      background: "#000000",
      surface: "#0A1A0A",
      text: "#00FF41",
      textSecondary: "#00AA2A",
      accent: "#00FF41",
      border: "#003B00",
      success: "#00FF41",
      headerGradient: ["#000000", "#003B00"],
    },
  },
  gothGlam: {
    id: "gothGlam",
    swiftId: "boldExpression",
    name: "Bold Expression",
    badgeName: "Elite Verified",
    minScore: 81,
    borderRadius: 18,
    shadowOpacity: 0.35,
    badgeSymbol: "star",
    badgeMeaning: "Highest trust level — fully verified and consistently positive contributor.",
    colors: {
      primary: "#9B59B6",
      secondary: "#E8D5F2",
      background: "#0D0A12",
      surface: "#1A1525",
      text: "#F5F0FA",
      textSecondary: "#B8A0C8",
      accent: "#C39BD3",
      border: "#2A2035",
      success: "#8E44AD",
      headerGradient: ["#1A1525", "#9B59B6"],
    },
  },
};

/** Canonical App Review / Play framing — cosmetic unlocks only. */
export const COMMUNITY_REPUTATION_EXPLAINER =
  "Community Reputation grows when you complete verification, receive positive feedback, finish safety education, and help keep Mangasm safe. Higher reputation unlocks cosmetic profile styles only — never messages, adult visibility, or sexual features.";

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.floor(score)));
}

export function getAvailableThemes(score: number): AppTheme[] {
  const s = clampScore(score);
  return Object.values(THEMES)
    .filter((t) => s >= t.minScore)
    .sort((a, b) => a.minScore - b.minScore);
}

export function getDefaultTheme(score: number): AppTheme {
  const available = getAvailableThemes(score);
  return available[available.length - 1] ?? THEMES.bobRoss;
}

export function isThemeUnlocked(id: ThemeId, score: number): boolean {
  return clampScore(score) >= THEMES[id].minScore;
}
