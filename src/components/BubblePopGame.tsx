import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, Trophy, Star } from 'lucide-react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  opacity: number;
}

// Module scope: a fresh array on every render made every useCallback that
// used it unstable.
const BUBBLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

interface BubblePopGameProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BubblePopGame: React.FC<BubblePopGameProps> = ({ isOpen, onClose }) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameTime] = useState(60); // 60 seconds game
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('bubble-pop-high-score');
    return saved ? parseInt(saved) : 0;
  });

  const createBubble = useCallback(() => {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return null;

    const rect = gameArea.getBoundingClientRect();
    const size = Math.random() * 40 + 20; // 20-60px
    
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (rect.width - size),
      y: rect.height + size,
      size,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      speed: Math.random() * 2 + 1, // 1-3px per frame
      opacity: 0.8 + Math.random() * 0.2
    };
  }, []);

  const popBubble = useCallback((bubbleId: number) => {
    setBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId));
    setScore(prev => prev + 10);
    
    // Create pop animation effect
    const popSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    popSound.volume = 0.1;
    popSound.play().catch(() => {}); // Ignore audio errors
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(gameTime);
    setBubbles([]);
  };

  const pauseGame = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setScore(0);
    setTimeLeft(gameTime);
    setBubbles([]);
  };

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameOver(true);
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('bubble-pop-high-score', score.toString());
    }
  }, [score, highScore]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const gameLoop = setInterval(() => {
      // Move bubbles up
      setBubbles(prev => prev.map(bubble => ({
        ...bubble,
        y: bubble.y - bubble.speed
      })).filter(bubble => bubble.y > -bubble.size)); // Remove bubbles that went off screen

      // Add new bubbles randomly
      if (Math.random() < 0.3) { // 30% chance each frame
        const newBubble = createBubble();
        if (newBubble) {
          setBubbles(prev => [...prev, newBubble]);
        }
      }
    }, 50); // 20 FPS

    return () => clearInterval(gameLoop);
  }, [isPlaying, isOpen, createBubble]);

  // Timer
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isOpen, endGame]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-50 p-4">
      <div className="modal-panel rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-surface bg-opacity-20 rounded-full flex items-center justify-center">
                <Star size={16} />
              </div>
              <h3 className="text-xl font-bold">Bubble Pop</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Game Stats */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center space-x-4">
              <div>
                <span className="opacity-80">Score: </span>
                <span className="font-bold text-lg">{score}</span>
              </div>
              <div>
                <span className="opacity-80">Time: </span>
                <span className="font-bold">{timeLeft}s</span>
              </div>
            </div>
            <div>
              <span className="opacity-80">Best: </span>
              <span className="font-bold">{highScore}</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative">
          <div
            id="game-area"
            className="relative w-full h-96 bg-gradient-to-b from-blue-100 to-blue-200 overflow-hidden cursor-crosshair"
            style={{ 
              backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.3), transparent 50%)',
            }}
          >
            {/* Bubbles */}
            {bubbles.map(bubble => (
              <div
                key={bubble.id}
                onClick={() => popBubble(bubble.id)}
                className="absolute rounded-full cursor-pointer transform transition-transform hover:scale-110 animate-pulse"
                style={{
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  backgroundColor: bubble.color,
                  opacity: bubble.opacity,
                  boxShadow: `0 0 ${bubble.size/4}px rgba(255, 255, 255, 0.5) inset, 0 0 ${bubble.size/8}px rgba(0, 0, 0, 0.2)`,
                }}
              />
            ))}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-void/80 flex items-center justify-center">
                <div className="bg-surface rounded-xl p-6 text-center shadow-xl">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-ink mb-2">Game Over!</h4>
                  <p className="text-ink/75 mb-2">Final Score: <span className="font-bold text-purple-600">{score}</span></p>
                  {score === highScore && score > 0 && (
                    <p className="text-sm text-yellow-600 font-medium mb-4">🎉 New High Score!</p>
                  )}
                  <button
                    onClick={startGame}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!isPlaying && !gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="bg-surface rounded-xl p-6 text-center shadow-xl max-w-xs">
                  <h4 className="text-lg font-bold text-ink mb-3">How to Play</h4>
                  <p className="text-sm text-ink/75 mb-4">
                    Tap the colorful bubbles as they float up! Each bubble gives you 10 points. 
                    Try to pop as many as you can before time runs out!
                  </p>
                  <button
                    onClick={startGame}
                    className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
                  >
                    <Play size={16} />
                    <span>Start Game</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-surface border-t">
          <div className="flex items-center justify-center space-x-3">
            {isPlaying ? (
              <button
                onClick={pauseGame}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Pause size={16} />
                <span>Pause</span>
              </button>
            ) : !gameOver && (
              <button
                onClick={startGame}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Play size={16} />
                <span>Start</span>
              </button>
            )}
            
            <button
              onClick={resetGame}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
          
          <p className="text-xs text-muted text-center mt-3">
            Take a quick break and pop some bubbles! 🫧
          </p>
        </div>
      </div>
    </div>
  );
};