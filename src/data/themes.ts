export const THEME_IDS = ['research', 'engineering', 'notes', 'visual'] as const;

export type ThemeId = (typeof THEME_IDS)[number];
