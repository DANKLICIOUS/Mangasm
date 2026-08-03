import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";
import { AppTheme, THEMES } from "./types";

export function ThemePicker() {
  const { theme, availableThemes, setPreferredTheme, reputationScore, explainer } = useTheme();

  const allThemes = Object.values(THEMES).sort(
    (a: AppTheme, b: AppTheme) => a.minScore - b.minScore
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: theme.colors.text }]}>Community Reputation</Text>
      <Text style={[styles.score, { color: theme.colors.textSecondary }]}>
        Score {reputationScore} · {theme.badgeName}
      </Text>
      <Text style={[styles.explainer, { color: theme.colors.textSecondary }]}>{explainer}</Text>
      <View style={styles.grid}>
        {allThemes.map((t: AppTheme) => {
          const unlocked = availableThemes.some((a) => a.id === t.id);
          const active = theme.id === t.id;
          return (
            <Pressable
              key={t.id}
              disabled={!unlocked}
              onPress={() => setPreferredTheme(t.id)}
              style={[
                styles.chip,
                {
                  borderColor: active ? t.colors.primary : theme.colors.border,
                  backgroundColor: unlocked ? theme.colors.surface : theme.colors.background,
                  opacity: unlocked ? 1 : 0.5,
                },
              ]}
              accessibilityLabel={
                unlocked
                  ? `${t.name}, ${active ? "selected" : "available"}`
                  : `${t.name}, locked until reputation ${t.minScore}`
              }
            >
              <View style={[styles.dot, { backgroundColor: t.colors.primary }]} />
              <Text style={[styles.chipTitle, { color: theme.colors.text }]}>{t.name}</Text>
              <Text style={[styles.chipMeta, { color: theme.colors.textSecondary }]}>
                {unlocked ? t.badgeName : `Unlocks at ${t.minScore}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 8 },
  heading: { fontSize: 16, fontWeight: "700" },
  score: { fontSize: 12, marginBottom: 4 },
  explainer: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  dot: { width: 22, height: 22, borderRadius: 11, marginBottom: 4 },
  chipTitle: { fontSize: 13, fontWeight: "700" },
  chipMeta: { fontSize: 10 },
});
