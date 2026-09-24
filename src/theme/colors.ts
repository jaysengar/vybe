/**
 * VYBE Design Tokens - dark-only palette
 * Converted from web app CSS custom properties (oklch -> hex).
 */
export const colors = {
  background: '#ffffff',
  foreground: '#1A1A1A',
  card: '#F4F4F4',
  cardForeground: '#1A1A1A',
  primary: '#0084FF', // vivid blue from reference
  primaryForeground: '#ffffff',
  secondary: '#E8E8E8',
  secondaryForeground: '#1A1A1A',
  muted: '#F0F0F0',
  mutedForeground: '#757575',
  accent: '#E0F0FF',
  accentForeground: '#0084FF',
  destructive: '#FF4B4B',
  destructiveForeground: '#ffffff',
  success: '#34C759',
  overlay: 'rgba(0,0,0,0.5)',
  surfaceHigh: '#ffffff',
  border: '#E0E0E0',
  input: '#F5F5F5',
  ring: '#0084FF',
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
