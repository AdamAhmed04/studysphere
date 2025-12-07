import { useState, useEffect } from 'react';
import { CustomTheme } from '../types';
import { themeColors } from '../utils/themeColors';

const DEFAULT_THEME: CustomTheme = {
  id: 'default',
  name: 'Default',
  backgroundColor: '#f8fafc',
  secondaryBackgroundColor: '#ffffff',
  textBoxColor: '#ffffff',
  buttonColor: '#3b82f6',
  isActive: true
};

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(() => {
    try {
      const saved = localStorage.getItem('studysphere-theme');
      if (saved) {
        const parsedTheme = JSON.parse(saved);
        // Merge with DEFAULT_THEME to ensure all properties exist
        return { ...DEFAULT_THEME, ...parsedTheme };
      }
      return DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const applyTheme = (theme: CustomTheme) => {
    // Apply CSS custom properties to the document root
    const root = document.documentElement;
    root.style.setProperty('--theme-background', theme.backgroundColor);
    root.style.setProperty('--theme-secondary-background', theme.secondaryBackgroundColor);
    root.style.setProperty('--theme-button-color', theme.buttonColor);
    root.style.setProperty('--theme-textbox-color', theme.textBoxColor || '#ffffff');
    
    // Calculate hover color (slightly darker)
    const hoverColor = darkenColor(theme.buttonColor || '#3b82f6', 10);
    root.style.setProperty('--theme-button-hover', hoverColor);
    
    // Calculate text color based on button background
    const textColor = getContrastTextColor(theme.buttonColor || '#3b82f6');
    root.style.setProperty('--theme-button-text', textColor);
    
    // Calculate border color for text boxes (slightly darker than background)
    const borderColor = darkenColor(theme.textBoxColor || '#ffffff', 15);
    root.style.setProperty('--theme-textbox-border', borderColor);
    
    // Calculate focus border color and shadow using button color
    root.style.setProperty('--theme-textbox-focus-border', theme.buttonColor || '#3b82f6');
    
    // Create focus shadow with button color and 10% opacity
    const buttonColorRgb = hexToRgb(theme.buttonColor || '#3b82f6');
    const focusShadow = `rgba(${buttonColorRgb.r}, ${buttonColorRgb.g}, ${buttonColorRgb.b}, 0.1)`;
    root.style.setProperty('--theme-button-focus-shadow', focusShadow);
    
    setCurrentTheme(theme);
    localStorage.setItem('studysphere-theme', JSON.stringify(theme));
  };

  const updateTheme = (updates: Partial<CustomTheme>) => {
    const updatedTheme = { ...currentTheme, ...updates };
    applyTheme(updatedTheme);
  };

  const resetToDefault = () => {
    applyTheme(DEFAULT_THEME);
  };

  // Apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

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