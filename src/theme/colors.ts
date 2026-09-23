/**
 * VYBE Design Tokens - dark-only palette
 * Converted from web app CSS custom properties (oklch -> hex).
 */
export const colors = {
  background: '#1a1625',
  foreground: '#ffffff',
  card: '#2a2438',
  cardForeground: '#ffffff',
  primary: '#7c3aed',
  primaryForeground: '#ffffff',
  secondary: '#352e47',
  secondaryForeground: '#ffffff',
  muted: '#302844',
  mutedForeground: '#9b8fb8',
  accent: '#3e3458',
  accentForeground: '#ffffff',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  success: '#22c55e',
  overlay: 'rgba(26,22,37,0.68)',
  surfaceHigh: '#3a3250',
  border: 'rgba(255,255,255,0.10)',
  input: 'rgba(255,255,255,0.14)',
  ring: '#8b5cf6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
