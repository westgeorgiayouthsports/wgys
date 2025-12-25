export const ThemeValues = {
  light: 'light',
  dark: 'dark',
} as const;

export type ThemeType = typeof ThemeValues[keyof typeof ThemeValues];

export const ThemeList = Object.values(ThemeValues) as ThemeType[];
