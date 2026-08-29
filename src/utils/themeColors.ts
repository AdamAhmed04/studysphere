export interface ThemeColor {
  name: string;
  value: string;
  lightVariant: string;
}

export const themeColors: ThemeColor[] = [
  {
    name: 'Light Grey',
    value: '#f3f4f6',
    lightVariant: '#f9fafb'
  },
  {
    name: 'White',
    value: '#ffffff',
    lightVariant: '#fefefe'
  },
  {
    name: 'Cream',
    value: '#fef7ed',
    lightVariant: '#fffbf5'
  },
  {
    name: 'Pastel Yellow',
    value: '#fef3c7',
    lightVariant: '#fefce8'
  },
  {
    name: 'Pastel Pink',
    value: '#fce7f3',
    lightVariant: '#fdf2f8'
  },
  {
    name: 'Pastel Blue',
    value: '#dbeafe',
    lightVariant: '#eff6ff'
  },
  {
    name: 'Pastel Red',
    value: '#fecaca',
    lightVariant: '#fef2f2'
  },
  {
    name: 'Pastel Brown',
    value: '#e7d3c8',
    lightVariant: '#f5f0ec'
  },
  {
    name: 'Pastel Purple',
    value: '#e9d5ff',
    lightVariant: '#f3e8ff'
  },
  {
    name: 'Pastel Green',
    value: '#bbf7d0',
    lightVariant: '#ecfdf5'
  }
];

export const getColorByName = (name: string): ThemeColor | undefined => {
  return themeColors.find(color => color.name === name);
};

export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - return dark text for light backgrounds
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1f2937' : '#ffffff';
};

export const getHoverColor = (color: string): string => {
  // Darken the color slightly for hover effect
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};