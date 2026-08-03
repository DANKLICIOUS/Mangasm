# `@mangasm/theme-provider`

React Native / shared TypeScript **Community Reputation** theme provider for Mangasm.

Aligns with iOS Swift `ProfileStyleCatalog` (aliases: `bobRoss` ↔ `calmStudio`, etc.).

## Safety (App Store / Play)

- Cosmetic styles only
- Score from verification, positive feedback, safety education, helpful reports
- **Never** matches, romantic message volume, or sexual metrics
- User may pick any **unlocked** style; never force a higher theme over a manual lower pick

## Install (when RN app exists)

```bash
# from monorepo root or RN app
npm install ../packages/theme-provider
# peer: react, react-native, @react-native-async-storage/async-storage
```

## Usage

```tsx
import { ThemeProvider, useTheme, ThemePicker, UnlockCelebration } from "@mangasm/theme-provider";

export function App() {
  return (
    <ThemeProvider initialScore={42}>
      <RootNavigator />
      <UnlockCelebration />
    </ThemeProvider>
  );
}

function Header() {
  const { theme, reputationScore } = useTheme();
  return (
    <Text style={{ color: theme.colors.primary }}>
      {reputationScore} · {theme.badgeName}
    </Text>
  );
}
```

## Server persistence

See `docs/superpowers/specs/2026-08-03-reputation-backend-schema.md`.
