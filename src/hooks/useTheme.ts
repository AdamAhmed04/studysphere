import { useState, useEffect } from 'react';
import { CustomTheme } from '../types';
import { themeColors } from '../utils/themeColors';
import { useAuthContext } from '../contexts/AuthContext';

const DEFAULT_THEME: CustomTheme = {
  id: 'default',
  name: 'Default',
  backgroundColor: '#f8fafc',
  secondaryBackgroundColor: '#ffffff',
  textBoxColor: '#ffffff',
  buttonColor: '#3b82f6',
  isActive: true
};

/*
 * Themes are stored per account.
 *
 * The key used to be a single global 'studysphere-theme', shared by everyone
 * who signed in on the browser, so a second user inherited the first one's
 * customisation. Same class as the profile-cache leak, with lower stakes.
 *
 * Signed-out state keeps its own key rather than borrowing whoever was last
 * signed in.
 */
const themeStorageKey = (userId?: string) =>
  userId ? `studysphere-theme:${userId}` : 'studysphere-theme:signed-out';

/** The single shared key this used to write to, before themes were per account. */
const LEGACY_THEME_KEY = 'studysphere-theme';

const readStoredTheme = (userId?: string): CustomTheme => {
  try {
    const key = themeStorageKey(userId);
    let saved = localStorage.getItem(key);

    /*
     * Adopt a theme saved under the old shared key, once.
     *
     * Without this, moving to per-account storage would silently reset the
     * customisation of anyone who already had one. The legacy key is removed
     * as it is adopted, so the first account to sign in inherits it and the
     * next account starts from the default rather than borrowing it — which
     * was the bug being fixed.
     */
    if (!saved && userId) {
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_THEME_KEY);
        saved = legacy;
      }
    }

    // Merged with the default so a theme saved before a new property existed
    // still has every field.
    return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

/** Writes the CSS custom properties. Does not touch state or storage. */
const writeThemeVars = (theme: CustomTheme) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-background', theme.backgroundColor);
  root.style.setProperty('--theme-secondary-background', theme.secondaryBackgroundColor);
  root.style.setProperty('--theme-button-color', theme.buttonColor);
  root.style.setProperty('--theme-textbox-color', theme.textBoxColor || '#ffffff');
  root.style.setProperty('--theme-button-hover', darkenColor(theme.buttonColor || '#3b82f6', 10));
  root.style.setProperty('--theme-button-text', getContrastTextColor(theme.buttonColor || '#3b82f6'));
  root.style.setProperty('--theme-textbox-border', darkenColor(theme.textBoxColor || '#ffffff', 15));
  root.style.setProperty('--theme-textbox-focus-border', theme.buttonColor || '#3b82f6');
  const rgb = hexToRgb(theme.buttonColor || '#3b82f6');
  root.style.setProperty('--theme-button-focus-shadow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
};

export const useTheme = () => {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(() => readStoredTheme(userId));

  const applyTheme = (theme: CustomTheme) => {
    writeThemeVars(theme);
    setCurrentTheme(theme);
    try {
      localStorage.setItem(themeStorageKey(userId), JSON.stringify(theme));
    } catch (error) {
      console.error('Could not save theme:', error);
    }
  };

  const updateTheme = (updates: Partial<CustomTheme>) => {
    const updatedTheme = { ...currentTheme, ...updates };
    applyTheme(updatedTheme);
  };

  const resetToDefault = () => {
    applyTheme(DEFAULT_THEME);
  };

  /*
   * Load whoever is signed in now. Runs on mount and whenever the account
   * changes, so signing in as someone else swaps to their theme rather than
   * leaving the previous user's colours on screen.
   *
   * Deliberately writeThemeVars and not applyTheme: this is reading a stored
   * theme, and applyTheme would write it straight back under the new key.
   */
  useEffect(() => {
    const stored = readStoredTheme(userId);
    writeThemeVars(stored);
    setCurrentTheme(stored);
  }, [userId]);

  return {
    currentTheme,
    applyTheme,
    updateTheme,
    resetToDefault,
    availableColors: themeColors
  };
};

// Helper functions
const darkenColor = (color: string, percent: number): string => {
  if (!color || typeof color !== 'string') {
    return '#000000'; // fallback color
  }
  const hex = color.replace('#', '');
  if (hex.length !== 6) {
    return '#000000'; // fallback for invalid hex
  }
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * percent / 100));
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * percent / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const getContrastTextColor = (backgroundColor: string): string => {
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return '#1f2937'; // fallback text color
  }
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) {
    return '#1f2937'; // fallback for invalid hex
  }
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1f2937' : '#ffffff';
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  if (!hex || typeof hex !== 'string') {
    return { r: 59, g: 130, b: 246 }; // fallback to blue
  }
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) {
    return { r: 59, g: 130, b: 246 }; // fallback to blue
  }
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return { r, g, b };
};