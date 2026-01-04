import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface ConfettiProps {
  show: boolean;
  onComplete?: () => void;
  pieceCount?: number;
  duration?: number;
  colors?: string[];
}

// Duolingo-style celebration colors
const defaultColors = [
  '#58CC02', // Feather Green
  '#7AE82A', // Light Green
  '#1CB0F6', // Sky Blue
  '#FF9600', // Warm Orange
  '#FFBE00', // Golden Yellow
  '#FF4B4B', // Berry Red
  '#CE82FF', // Grape Purple
  '#2DD4BF', // Teal
];

/**
 * Confetti explosion effect for celebrations
 * Creates colorful falling pieces with rotation
 */
export function Confetti({
  show,
  onComplete,
  pieceCount = 50,
  duration = 2500,
  colors = defaultColors,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const generatePieces = useCallback(() => {
    return Array.from({ length: pieceCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Random horizontal position (0-100%)
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3, // Stagger start time
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5, // Random size variation
    }));
  }, [pieceCount, colors]);

  useEffect(() => {
    if (show) {
      setPieces(generatePieces());
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setPieces([]);
    }
  }, [show, generatePieces, duration, onComplete]);

  // Reduced motion: Show simple flash instead
  if (prefersReducedMotion) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: colors[0] }}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3"
              style={{
                left: `${piece.x}%`,
                top: -20,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `scale(${piece.scale})`,
              }}
              initial={{
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
                x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
              }}
              transition={{
                duration: duration / 1000,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfettiBurstProps {
  show: boolean;
  onComplete?: () => void;
  originX?: number;
  originY?: number;
}

/**
 * Localized confetti burst from a specific point
 * Good for button celebrations
 */
export function ConfettiBurst({
  show,
  onComplete,
  originX = 50,
  originY = 50,
}: ConfettiBurstProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (show) {
      setPieces(
        Array.from({ length: 20 }, (_, i) => ({
          id: i,
          x: originX,
          color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
          delay: Math.random() * 0.1,
          rotation: Math.random() * 360,
          scale: 0.3 + Math.random() * 0.4,
        }))
      );
      const timer = setTimeout(() => {
        onComplete?.();
        setPieces([]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, originX, originY, onComplete]);

  if (prefersReducedMotion || !show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => {
        const angle = (piece.id / 20) * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;

        return (
          <motion.div
            key={piece.id}
            className="absolute w-2 h-2"
            style={{
              left: `${originX}%`,
              top: `${originY}%`,
              backgroundColor: piece.color,
              borderRadius: '50%',
              transform: `scale(${piece.scale})`,
            }}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{
              scale: [0, piece.scale, 0],
              x: endX,
              y: endY,
              rotate: piece.rotation,
            }}
            transition={{
              duration: 1,
              delay: piece.delay,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

export default Confetti;
