/**
 * Matte, retro-modern editorial palette per the design brief - muted teal,
 * coral, sand, charcoal. Deliberately not black-dominant: each screen picks
 * a different one of these as its background so the app reads as a
 * balanced palette, not a dark theme.
 */
export const colors = {
  teal: "#3E6868",
  tealDark: "#2C4C4C",
  coral: "#C94E44",
  coralDark: "#A83E36",
  sand: "#C1AB85",
  sandLight: "#EDE4D3",
  charcoal: "#171817",
  charcoalLight: "#2A2B29",
  offWhite: "#F6F3EC",
  white: "#FFFFFF",
  textOnLight: "#171817",
  textOnDark: "#F6F3EC",
  textMuted: "#6B6862",
  border: "#D9D0BE",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const type = {
  title: { fontSize: 28, fontWeight: "700" as const },
  sectionLabel: { fontSize: 13, fontWeight: "700" as const, letterSpacing: 1 },
  body: { fontSize: 15, fontWeight: "400" as const },
  button: { fontSize: 15, fontWeight: "600" as const },
  value: { fontSize: 20, fontWeight: "700" as const },
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
} as const;
