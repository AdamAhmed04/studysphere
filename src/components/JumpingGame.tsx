import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Trophy, Zap } from 'lucide-react';

interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
}

// Module scope: these are fixed, and re-creating them each render made the
// game loop callbacks change identity on every frame.
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const GAME_SPEED = 3;

interface JumpingGameProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JumpingGame: React.FC<JumpingGameProps> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerY, setPlayerY] = useState(200); // Player vertical position
  const [playerVelocity, setPlayerVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('jumping-game-high-score');
    return saved ? parseInt(saved) : 0;
  });

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastObstacleRef = useRef<number>(0);

  // Game constants


  const GROUND_Y = 200;
  const PLAYER_SIZE = 40;

  const OBSTACLE_SPAWN_DISTANCE = 300;

  const jump = useCallback(() => {
    if (!isPlaying || gameOver) return;
    if (playerY >= GROUND_Y - 5) { // Only jump if on ground
      setPlayerVelocity(JUMP_FORCE);
    }
  }, [isPlaying, gameOver, playerY]);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setPlayerY(GROUND_Y);
    setPlayerVelocity(0);
    setObstacles([]);
    lastObstacleRef.current = 0;
  };

  const pauseGame = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setScore(0);
    setPlayerY(GROUND_Y);
    setPlayerVelocity(0);
    setObstacles([]);
    lastObstacleRef.current = 0;
  };

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameOver(true);
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('jumping-game-high-score', score.toString());
    }
  }, [score, highScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, jump]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !isOpen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const gameLoop = () => {
      // Update player physics
      setPlayerVelocity(prev => prev + GRAVITY);
      setPlayerY(prev => {
        const newY = prev + playerVelocity;
        return Math.min(newY, GROUND_Y); // Don't go below ground
      });

      // Reset velocity when hitting ground
      if (playerY >= GROUND_Y) {
        setPlayerVelocity(0);
      }

      // Move obstacles and add new ones
      setObstacles(prev => {
        const newObstacles = prev.map(obstacle => ({
          ...obstacle,
          x: obstacle.x - GAME_SPEED
        })).filter(obstacle => obstacle.x > -obstacle.width);

        // Add new obstacle
        const lastObstacle = newObstacles[newObstacles.length - 1];
        const shouldSpawnObstacle = !lastObstacle || 
          (400 - lastObstacle.x) >= OBSTACLE_SPAWN_DISTANCE;

        if (shouldSpawnObstacle) {
          const obstacleHeight = 30 + Math.random() * 40; // Random height 30-70px
          newObstacles.push({
            id: Date.now(),
            x: 400,
            width: 20,
            height: obstacleHeight
          });
        }

        return newObstacles;
      });

      // Update score
      setScore(prev => prev + 1);

      // Check collisions
      const playerLeft = 50;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerTop = playerY;
      const playerBottom = playerY + PLAYER_SIZE;

      const collision = obstacles.some(obstacle => {
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleTop = GROUND_Y + PLAYER_SIZE - obstacle.height;
        const obstacleBottom = GROUND_Y + PLAYER_SIZE;

        return playerRight > obstacleLeft &&
               playerLeft < obstacleRight &&
               playerBottom > obstacleTop &&
               playerTop < obstacleBottom;
      });

      if (collision) {
        endGame();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isOpen, playerVelocity, playerY, obstacles, endGame]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-50 p-4">
      <div className="modal-panel rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-surface bg-opacity-20 rounded-full flex items-center justify-center">
                <Zap size={16} />
              </div>
              <h3 className="text-xl font-bold">Jump Runner</h3>
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
            ref={gameAreaRef}
            className="relative w-full h-80 bg-gradient-to-b from-sky-200 to-green-200 overflow-hidden cursor-pointer"
            onClick={jump}
            style={{ 
              backgroundImage: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)',
            }}
          >
            {/* Ground */}
            <div 
              className="absolute bottom-0 w-full bg-green-600"
              style={{ height: `${80 - GROUND_Y + 240}px` }}
            />
            
            {/* Clouds */}
            <div className="absolute top-4 left-10 text-white text-2xl opacity-70">☁️</div>
            <div className="absolute top-8 right-16 text-white text-xl opacity-60">☁️</div>
            <div className="absolute top-12 left-32 text-white text-lg opacity-50">☁️</div>

            {/* Player */}
            <div
              className="absolute w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-100 shadow-lg"
              style={{
                left: '50px',
                top: `${playerY}px`,
                transform: playerVelocity < 0 ? 'rotate(-10deg)' : playerVelocity > 5 ? 'rotate(10deg)' : 'rotate(0deg)'
              }}
            >
              🏃‍♂️
            </div>

            {/* Obstacles */}
            {obstacles.map(obstacle => (
              <div
                key={obstacle.id}
                className="absolute bg-red-600 rounded-t-lg shadow-lg"
                style={{
                  left: `${obstacle.x}px`,
                  bottom: `${80 - GROUND_Y + 240}px`,
                  width: `${obstacle.width}px`,
                  height: `${obstacle.height}px`,
                }}
              />
            ))}

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-void/80 flex items-center justify-center">
                <div className="bg-surface rounded-xl p-6 text-center shadow-xl">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-ink mb-2">Game Over!</h4>
                  <p className="text-ink/75 mb-2">Final Score: <span className="font-bold text-green-600">{score}</span></p>
                  {score === highScore && score > 0 && (
                    <p className="text-sm text-yellow-600 font-medium mb-4">🎉 New High Score!</p>
                  )}
                  <button
                    onClick={startGame}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                    Tap anywhere or press SPACE to jump! Avoid the red obstacles and see how far you can run.
                  </p>
                  <button
                    onClick={startGame}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto"
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
          <div className="flex items-center justify-center space-x-3 mb-3">
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

            <button
              onClick={jump}
              disabled={!isPlaying || gameOver}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold"
            >
              <Zap size={20} />
              <span>JUMP!</span>
            </button>
          </div>
          
          <p className="text-xs text-muted text-center">
            Tap anywhere, press SPACE, or use the JUMP button! 🏃‍♂️
          </p>
        </div>
      </div>
    </div>
  );
};