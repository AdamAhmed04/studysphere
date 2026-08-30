import React, { useState } from 'react';
import { Palette, RotateCcw, Check, Eye } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { themeColors } from '../utils/themeColors';

export const ThemeCustomizer: React.FC = () => {
  const { currentTheme, updateTheme, resetToDefault } = useTheme();
  const [previewMode, setPreviewMode] = useState(false);
  const [tempTheme, setTempTheme] = useState(currentTheme);

  const handleColorSelect = (type: 'backgroundColor' | 'secondaryBackgroundColor' | 'buttonColor', color: string, isLight: boolean = false) => {
    const selectedColor = isLight ? themeColors.find(c => c.value === color)?.lightVariant || color : color;
    const newTheme = { ...tempTheme, [type]: selectedColor };
    setTempTheme(newTheme);
    
    if (previewMode) {
      updateTheme(newTheme);
    }
  };

  const handleApplyTheme = () => {
    updateTheme({
      backgroundColor: tempTheme.backgroundColor,
      secondaryBackgroundColor: tempTheme.secondaryBackgroundColor,
      buttonColor: tempTheme.buttonColor,
      textBoxColor: tempTheme.textBoxColor
    });
    setPreviewMode(false);
  };

  const handlePreviewToggle = () => {
    if (previewMode) {
      // Exit preview mode - revert to saved theme
      updateTheme(currentTheme);
      setTempTheme(currentTheme);
    } else {
      // Enter preview mode - apply temp theme
      updateTheme(tempTheme);
    }
    setPreviewMode(!previewMode);
  };

  const handleReset = () => {
    resetToDefault();
    setTempTheme(currentTheme);
    setPreviewMode(false);
  };

  const ColorPalette: React.FC<{ 
    title: string; 
    selectedColor: string; 
    onColorSelect: (color: string, isLight?: boolean) => void;
  }> = ({ title, selectedColor, onColorSelect }) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
      
      {/* Regular Colors */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-3">Standard Colors</p>
        <div className="grid grid-cols-5 gap-3">
          {themeColors.map((color) => (
            <button
              key={`${title}-${color.name}`}
              onClick={() => onColorSelect(color.value)}
             className={`relative w-12 h-12 rounded-xl border-2 transition-all hover:scale-110 hover:shadow-lg group ${
                selectedColor === color.value ? 'border-gray-800 ring-2 ring-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {selectedColor === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check size={16} className="text-gray-800" />
                </div>
              )}
             {/* Hover tooltip */}
             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
               {color.name}
             </div>
             {/* Active state overlay */}
             <div className={`absolute inset-0 rounded-xl transition-all ${
               selectedColor === color.value 
                 ? 'bg-black bg-opacity-20' 
                 : 'bg-transparent hover:bg-white hover:bg-opacity-20'
             }`}></div>
            </button>
          ))}
        </div>
      </div>

      {/* Light Variants */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-3">Light Variants</p>
        <div className="grid grid-cols-5 gap-3">
          {themeColors.map((color) => (
            <button
              key={`${title}-light-${color.name}`}
              onClick={() => onColorSelect(color.value, true)}
             className={`relative w-12 h-12 rounded-xl border-2 transition-all hover:scale-110 hover:shadow-lg group ${
                selectedColor === color.lightVariant ? 'border-gray-800 ring-2 ring-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color.lightVariant }}
              title={`Light ${color.name}`}
            >
              {selectedColor === color.lightVariant && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check size={16} className="text-gray-800" />
                </div>
              )}
             {/* Hover tooltip */}
             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
               Light {color.name}
             </div>
             {/* Active state overlay */}
             <div className={`absolute inset-0 rounded-xl transition-all ${
               selectedColor === color.lightVariant 
                 ? 'bg-black bg-opacity-20' 
                 : 'bg-transparent hover:bg-white hover:bg-opacity-20'
             }`}></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
          <Palette className="mr-3 text-purple-500" size={28} />
          Theme Customization
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handlePreviewToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              previewMode 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Eye size={16} />
            <span>{previewMode ? 'Exit Preview' : 'Preview'}</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Current Theme Preview */}
        <div className="p-4 rounded-xl border-2 border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Current Theme Preview</h4>
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: tempTheme.backgroundColor }}
          >
            <div className="mb-4">
              <h6 className="text-sm font-medium text-gray-700 mb-2">Primary Background</h6>
              <p className="text-xs text-gray-600">This is the main app background color you selected</p>
            </div>
            <div className="space-y-4" style={{ backgroundColor: tempTheme.secondaryBackgroundColor, padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <h6 className="text-sm font-medium text-gray-700">Secondary Background</h6>
              <p className="text-xs text-gray-600">This shows how text areas and central squares will appear (cards, panels, navigation, etc.)</p>
            </div>
            <div className="space-y-4">
              <h6 className="text-sm font-medium text-gray-700 mb-2">Button Colors</h6>
              <div className="flex space-x-3">
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ 
                    backgroundColor: tempTheme.buttonColor,
                    color: getContrastTextColor(tempTheme.buttonColor)
                  }}
                >
                  Primary Button
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Secondary Button
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">All app buttons will use your selected button color</p>
            </div>
          </div>
        </div>

        {/* Primary Background Color Selection */}
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Primary Background Color</h4>
            <p className="text-sm text-gray-600 mb-4">This color will be used for the main background of the app</p>
          </div>
          <ColorPalette
            title=""
            selectedColor={tempTheme.backgroundColor}
            onColorSelect={(color, isLight) => handleColorSelect('backgroundColor', color, isLight)}
          />
        </div>

        {/* Secondary Background Color Selection */}
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Secondary Background Color</h4>
            <p className="text-sm text-gray-600 mb-4">This color will be used for background areas where text is displayed and for central squares in the layout (cards, panels, navigation)</p>
          </div>
          <ColorPalette
            title=""
            selectedColor={tempTheme.secondaryBackgroundColor}
            onColorSelect={(color, isLight) => handleColorSelect('secondaryBackgroundColor', color, isLight)}
          />
        </div>

        {/* Button Color Selection */}
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Button Color</h4>
            <p className="text-sm text-gray-600 mb-4">This color will determine the color of all buttons across the app</p>
          </div>
          <ColorPalette
            title=""
            selectedColor={tempTheme.buttonColor}
            onColorSelect={(color, isLight) => handleColorSelect('buttonColor', color, isLight)}
          />
        </div>

        {/* Apply Button */}
        {(tempTheme.backgroundColor !== currentTheme.backgroundColor || 
          tempTheme.secondaryBackgroundColor !== currentTheme.secondaryBackgroundColor ||
          tempTheme.buttonColor !== currentTheme.buttonColor) && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleApplyTheme}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg transition-all shadow-lg btn-primary"
            >
              <Check size={20} />
              <span>Apply Theme</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function
const getContrastTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1f2937' : '#ffffff';
};