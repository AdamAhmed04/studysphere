export interface ColorTheme {
  name: string;
  color: string;
  gradient: string;
  waveColor: string;
}

export const colorThemes: Record<string, ColorTheme> = {
  purple: {
    name: 'Purple',
    color: '#8B5CF6',
    gradient: 'from-purple-400 to-purple-600',
    waveColor: 'rgba(139, 92, 246, 0.3)'
  },
  blue: {
    name: 'Blue',
    color: '#3B82F6',
    gradient: 'from-blue-400 to-blue-600',
    waveColor: 'rgba(59, 130, 246, 0.3)'
  },
  green: {
    name: 'Green',
    color: '#10B981',
    gradient: 'from-green-400 to-green-600',
    waveColor: 'rgba(16, 185, 129, 0.3)'
  },
  white: {
    name: 'White',
    color: '#F8FAFC',
    gradient: 'from-gray-100 to-gray-200',
    waveColor: 'rgba(148, 163, 184, 0.2)'
  },
  red: {
    name: 'Red',
    color: '#EF4444',
    gradient: 'from-red-400 to-red-600',
    waveColor: 'rgba(239, 68, 68, 0.3)'
  },
  pink: {
    name: 'Pink',
    color: '#EC4899',
    gradient: 'from-pink-400 to-pink-600',
    waveColor: 'rgba(236, 72, 153, 0.3)'
  },
  orange: {
    name: 'Orange',
    color: '#F97316',
    gradient: 'from-orange-400 to-orange-600',
    waveColor: 'rgba(249, 115, 22, 0.3)'
  },
  yellow: {
    name: 'Yellow',
    color: '#EAB308',
    gradient: 'from-yellow-400 to-yellow-600',
    waveColor: 'rgba(234, 179, 8, 0.3)'
  },
  brown: {
    name: 'Brown',
    color: '#A16207',
    gradient: 'from-amber-600 to-amber-800',
    waveColor: 'rgba(161, 98, 7, 0.3)'
  },
  maroon: {
    name: 'Maroon',
    color: '#7C2D12',
    gradient: 'from-red-800 to-red-900',
    waveColor: 'rgba(124, 45, 18, 0.3)'
  }
};

export const getColorTheme = (color: string): ColorTheme => {
  return colorThemes[color] || colorThemes.blue;
};