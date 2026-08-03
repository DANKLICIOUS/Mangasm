import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";

/**
 * Non-intrusive unlock celebration — cosmetic style only.
 * Copy is App Store / Play safe (no level-up / grind language).
 */
export function UnlockCelebration() {
  const { theme, pendingUnlocks, clearPendingUnlocks } = useTheme();
  const unlock = pendingUnlocks[0];

  useEffect(() => {
    if (!unlock) return;
    const t = setTimeout(() => clearPendingUnlocks(), 2800);
    return () => clearTimeout(t);
  }, [unlock, clearPendingUnlocks]);

  if (!unlock) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <Pressable style={styles.backdrop} onPress={clearPendingUnlocks}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: unlock.colors.primary,
            },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: unlock.colors.primary }]}>
            <Text style={styles.badgeGlyph}>★</Text>
          </View>
          <Text style={[styles.kicker, { color: theme.colors.textSecondary }]}>
            New style unlocked
          </Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>{unlock.name}</Text>
          <Text style={[styles.badgeName, { color: unlock.colors.primary }]}>
            {unlock.badgeName}
          </Text>
          <Text style={[styles.meaning, { color: theme.colors.textSecondary }]}>
            {unlock.badgeMeaning}
          </Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Cosmetic only — switch anytime in Profile styles.
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 22,
    alignItems: "center",
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  badgeGlyph: { color: "#fff", fontSize: 24, fontWeight: "700" },
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  badgeName: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  meaning: { fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 10 },
  hint: { fontSize: 11, textAlign: "center" },
});
