import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Trophy, RotateCw, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface Block {
  x: number;
  y: number;
  color: string;
}

interface Piece {
  blocks: Block[];
  type: string;
  rotation: number;
}

interface BlockDropGameProps {
  isOpen: boolean;
  onClose: () => void;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 25;

// Tetris piece shapes
const PIECES = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  O: [
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]],
  ],
};

const PIECE_COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

export const BlockDropGame: React.FC<BlockDropGameProps> = ({ isOpen, onClose }) => {
  const [board, setBoard] = useState<string[][]>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(''))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<string>('');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [dropTime, setDropTime] = useState(1000);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('block-drop-high-score');
    return saved ? parseInt(saved) : 0;
  });

  const gameLoopRef = useRef<NodeJS.Timeout>();
  const lastDropTime = useRef<number>(0);

  const pieceTypes = Object.keys(PIECES) as (keyof typeof PIECES)[];

  const getRandomPiece = useCallback((): string => {
    return pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
  }, [pieceTypes]);

  const createPiece = useCallback((type: string, x: number = 4, y: number = 0): Piece => {
    const shape = PIECES[type as keyof typeof PIECES][0];
    const blocks: Block[] = [];
    
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          blocks.push({
            x: x + colIndex,
            y: y + rowIndex,
            color: PIECE_COLORS[type as keyof typeof PIECE_COLORS],
          });
        }
      });
    });

    return {
      blocks,
      type,
      rotation: 0,
    };
  }, []);

  const isValidPosition = useCallback((piece: Piece, board: string[][]): boolean => {
    return piece.blocks.every(block => {
      return (
        block.x >= 0 &&
        block.x < BOARD_WIDTH &&
        block.y >= 0 &&
        block.y < BOARD_HEIGHT &&
        board[block.y][block.x] === ''
      );
    });
  }, []);

  const rotatePiece = useCallback((piece: Piece): Piece => {
    const shapes = PIECES[piece.type as keyof typeof PIECES];
    const nextRotation = (piece.rotation + 1) % shapes.length;
    const shape = shapes[nextRotation];
    
    const blocks: Block[] = [];
    const centerX = piece.blocks[0].x;
    const centerY = piece.blocks[0].y;
    
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          blocks.push({
            x: centerX + colIndex,
            y: centerY + rowIndex,
            color: piece.blocks[0].color,
          });
        }
      });
    });

    return {
      ...piece,
      blocks,
      rotation: nextRotation,
    };
  }, []);

  const movePiece = useCallback((piece: Piece, dx: number, dy: number): Piece => {
    return {
      ...piece,
      blocks: piece.blocks.map(block => ({
        ...block,
        x: block.x + dx,
        y: block.y + dy,
      })),
    };
  }, []);

  const placePiece = useCallback((piece: Piece, board: string[][]): string[][] => {
    const newBoard = board.map(row => [...row]);
    piece.blocks.forEach(block => {
      if (block.y >= 0) {
        newBoard[block.y][block.x] = block.color;
      }
    });
    return newBoard;
  }, []);

  const clearLines = useCallback((board: string[][]): { newBoard: string[][]; linesCleared: number } => {
    const newBoard = board.filter(row => row.some(cell => cell === ''));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(''));
    }
    
    return { newBoard, linesCleared };
  }, []);

  const startGame = useCallback(() => {
    const newBoard = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(''));
    setBoard(newBoard);
    setScore(0);
    setLines(0);
    setLevel(1);
    setDropTime(1000);
    setGameOver(false);
    setIsPlaying(true);
    
    const firstPiece = getRandomPiece();
    const nextPieceType = getRandomPiece();
    setCurrentPiece(createPiece(firstPiece));
    setNextPiece(nextPieceType);
    lastDropTime.current = Date.now();
  }, [getRandomPiece, createPiece]);

  const pauseGame = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setCurrentPiece(null);
    setScore(0);
    setLines(0);
    setLevel(1);
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill('')));
  };

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameOver(true);
    
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('block-drop-high-score', score.toString());
    }
  }, [score, highScore]);

  // Game controls
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying || !currentPiece || gameOver) return;

    let newPiece: Piece | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newPiece = movePiece(currentPiece, -1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newPiece = movePiece(currentPiece, 1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newPiece = movePiece(currentPiece, 0, 1);
        break;
      case 'ArrowUp':
      case ' ':
        e.preventDefault();
        newPiece = rotatePiece(currentPiece);
        break;
    }

    if (newPiece && isValidPosition(newPiece, board)) {
      setCurrentPiece(newPiece);
    }
  }, [isPlaying, currentPiece, gameOver, board, movePiece, rotatePiece, isValidPosition]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !currentPiece) return;

    gameLoopRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastDropTime.current > dropTime) {
        const droppedPiece = movePiece(currentPiece, 0, 1);
        
        if (isValidPosition(droppedPiece, board)) {
          setCurrentPiece(droppedPiece);
        } else {
          // Place the piece
          const newBoard = placePiece(currentPiece, board);
          const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
          
          setBoard(clearedBoard);
          setLines(prev => prev + linesCleared);
          setScore(prev => prev + linesCleared * 100 * level + 10);
          
          // Level up every 10 lines
          if (lines + linesCleared >= level * 10) {
            setLevel(prev => prev + 1);
            setDropTime(prev => Math.max(100, prev - 50));
          }
          
          // Spawn new piece
          const newPiece = createPiece(nextPiece);
          if (isValidPosition(newPiece, clearedBoard)) {
            setCurrentPiece(newPiece);
            setNextPiece(getRandomPiece());
          } else {
            endGame();
          }
        }
        
        lastDropTime.current = now;
      }
    }, 50);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isPlaying, currentPiece, board, dropTime, level, lines, nextPiece, movePiece, isValidPosition, placePiece, clearLines, createPiece, getRandomPiece, endGame]);

  // Keyboard controls
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, handleKeyPress]);

  // Render the game board
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // Add current piece to display
    if (currentPiece) {
      currentPiece.blocks.forEach(block => {
        if (block.y >= 0 && block.y < BOARD_HEIGHT && block.x >= 0 && block.x < BOARD_WIDTH) {
          displayBoard[block.y][block.x] = block.color;
        }
      });
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className="border border-gray-300"
            style={{
              width: BLOCK_SIZE,
              height: BLOCK_SIZE,
              backgroundColor: cell || '#f8f9fa',
            }}
          />
        ))}
      </div>
    ));
  };

  // Render next piece preview
  const renderNextPiece = () => {
    if (!nextPiece) return null;
    
    const shape = PIECES[nextPiece as keyof typeof PIECES][0];
    const color = PIECE_COLORS[nextPiece as keyof typeof PIECE_COLORS];
    
    return (
      <div className="grid gap-0.5">
        {shape.map((row, y) => (
          <div key={y} className="flex gap-0.5">
            {row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className="border border-gray-200"
                style={{
                  width: 15,
                  height: 15,
                  backgroundColor: cell ? color : '#f8f9fa',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Trophy size={16} />
              </div>
              <h3 className="text-xl font-bold">Block Drop</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 flex gap-6">
          {/* Game Board */}
          <div className="flex-1">
            <div className="bg-gray-100 p-4 rounded-lg inline-block">
              {renderBoard()}
            </div>
          </div>

          {/* Game Info & Controls */}
          <div className="w-64 space-y-4">
            {/* Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className="font-bold">{score}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lines:</span>
                  <span className="font-bold">{lines}</span>
                </div>
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-bold">{level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Best:</span>
                  <span className="font-bold">{highScore}</span>
                </div>
              </div>
            </div>

            {/* Next Piece */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">Next</h4>
              <div className="flex justify-center">
                {renderNextPiece()}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">Controls</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <ArrowLeft size={12} />
                  <ArrowRight size={12} />
                  <span>Move</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowDown size={12} />
                  <span>Drop</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCw size={12} />
                  <span>Rotate (↑ or Space)</span>
                </div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="space-y-3">
              {!isPlaying && !gameOver && (
                <button
                  onClick={startGame}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play size={16} />
                  <span>Start Game</span>
                </button>
              )}

              {isPlaying && (
                <button
                  onClick={pauseGame}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Pause size={16} />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={resetGame}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </div>

            {/* Game Over */}
            {gameOver && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <Trophy className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="font-bold text-red-800 mb-1">Game Over!</h4>
                <p className="text-sm text-red-600 mb-3">Final Score: {score}</p>
                {score === highScore && score > 0 && (
                  <p className="text-xs text-yellow-600 font-medium mb-2">🎉 New High Score!</p>
                )}
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};