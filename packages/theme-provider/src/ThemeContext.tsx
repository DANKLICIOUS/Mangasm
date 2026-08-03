import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppTheme,
  COMMUNITY_REPUTATION_EXPLAINER,
  ThemeId,
  THEMES,
  getAvailableThemes,
  getDefaultTheme,
  isThemeUnlocked,
} from "./types";

const STORAGE_KEY = "@mangasm_preferred_theme";
const SEEN_KEY = "@mangasm_seen_theme_unlocks";

export interface ThemeContextValue {
  theme: AppTheme;
  availableThemes: AppTheme[];
  setPreferredTheme: (id: ThemeId) => Promise<void>;
  reputationScore: number;
  setReputationScore: (score: number) => void;
  /** Themes newly unlocked by the last score change (for celebration UI). */
  pendingUnlocks: AppTheme[];
  clearPendingUnlocks: () => void;
  explainer: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialScore?: number;
  /** Optional external persistence (e.g. Supabase) instead of AsyncStorage. */
  onPersistPreferred?: (id: ThemeId | null) => void;
}

export function ThemeProvider({
  children,
  initialScore = 0,
  onPersistPreferred,
}: ThemeProviderProps) {
  const [reputationScore, setReputationScoreState] = useState(initialScore);
  const [preferredThemeId, setPreferredThemeId] = useState<ThemeId | null>(null);
  const [seenUnlocks, setSeenUnlocks] = useState<Set<ThemeId>>(new Set());
  const [pendingUnlocks, setPendingUnlocks] = useState<AppTheme[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [pref, seenRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEEN_KEY),
        ]);
        if (pref && pref in THEMES) {
          setPreferredThemeId(pref as ThemeId);
        }
        if (seenRaw) {
          const parsed = JSON.parse(seenRaw) as string[];
          setSeenUnlocks(new Set(parsed.filter((id): id is ThemeId => id in THEMES)));
        }
      } catch {
        // ignore corrupt storage
      }
    })();
  }, []);

  const availableThemes = useMemo(() => getAvailableThemes(reputationScore), [reputationScore]);

  // Seed seen unlocks once so high scores don't spam all toasts on first launch.
  useEffect(() => {
    if (seeded.current) return;
    if (seenUnlocks.size > 0) {
      seeded.current = true;
      return;
    }
    if (availableThemes.length === 0) return;
    const next = new Set(availableThemes.map((t) => t.id));
    setSeenUnlocks(next);
    seeded.current = true;
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next])).catch(() => {});
  }, [availableThemes, seenUnlocks.size]);

  const theme = useMemo(() => {
    if (preferredThemeId && isThemeUnlocked(preferredThemeId, reputationScore)) {
      return THEMES[preferredThemeId];
    }
    return getDefaultTheme(reputationScore);
  }, [preferredThemeId, reputationScore]);

  const setPreferredTheme = useCallback(
    async (id: ThemeId) => {
      if (!isThemeUnlocked(id, reputationScore)) return;
      setPreferredThemeId(id);
      onPersistPreferred?.(id);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      } catch {
        // ignore
      }
    },
    [reputationScore, onPersistPreferred]
  );

  const setReputationScore = useCallback(
    (score: number) => {
      const prevAvailable = getAvailableThemes(reputationScore).map((t) => t.id);
      const nextScore = Math.min(100, Math.max(0, Math.floor(score)));
      const nextAvailable = getAvailableThemes(nextScore);
      const newly = nextAvailable.filter(
        (t) => !prevAvailable.includes(t.id) && !seenUnlocks.has(t.id)
      );
      setReputationScoreState(nextScore);
      if (newly.length > 0) {
        setPendingUnlocks(newly);
        const merged = new Set(seenUnlocks);
        nextAvailable.forEach((t) => merged.add(t.id));
        setSeenUnlocks(merged);
        AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...merged])).catch(() => {});
      }
    },
    [reputationScore, seenUnlocks]
  );

  const clearPendingUnlocks = useCallback(() => setPendingUnlocks([]), []);

  const value: ThemeContextValue = {
    theme,
    availableThemes,
    setPreferredTheme,
    reputationScore,
    setReputationScore,
    pendingUnlocks,
    clearPendingUnlocks,
    explainer: COMMUNITY_REPUTATION_EXPLAINER,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
