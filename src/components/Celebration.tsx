import React, { useEffect, useState } from 'react';

interface Explosion {
  id: number;
  x: number;
  y: number;
  delay: number;
}

interface CelebrationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const Celebration: React.FC<CelebrationProps> = ({ isVisible, onComplete }) => {
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate random explosions across the screen
      const newExplosions: Explosion[] = [];
      for (let i = 0; i < 12; i++) {
        newExplosions.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 1000,
        });
      }
      setExplosions(newExplosions);

      // Auto-hide after animation completes
      const timer = setTimeout(() => {
        onComplete();
        setExplosions([]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {explosions.map((explosion) => (
        <div
          key={explosion.id}
          className="absolute animate-ping"
          style={{
            left: `${explosion.x}%`,
            top: `${explosion.y}%`,
            animationDelay: `${explosion.delay}ms`,
            animationDuration: '1.5s',
          }}
        >
          <div className="relative">
            {/* Main explosion circle */}
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full opacity-80 animate-pulse"></div>
            
            {/* Sparkle particles */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-bounce"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            
            {/* Additional sparkles */}
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-surface rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
            <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-surface rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute left-0 top-1/2 w-1 h-1 bg-surface rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute right-0 top-1/2 w-1 h-1 bg-surface rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
          </div>
        </div>
      ))}
      
      {/* Celebration message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl animate-bounce">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-ink mb-2">Study Complete!</h2>
            <p className="text-lg text-ink/75">Great job on finishing your session!</p>
          </div>
        </div>
      </div>
    </div>
  );
};