import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale';

export const BreathingModal: React.FC<BreathingModalProps> = ({ isOpen, onClose }) => {
  const [isActive, setIsActive] = useState(true);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  useEffect(() => {
    if (!isOpen || !isActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Advance phase according to 4-7-8 breathing pattern
        if (phase === 'inhale') {
          setPhase('hold');
          return 7;
        } else if (phase === 'hold') {
          setPhase('exhale');
          return 8;
        } else {
          setPhase('inhale');
          setCyclesCompleted((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isActive, phase]);

  const reset = () => {
    setPhase('inhale');
    setCountdown(4);
    setCyclesCompleted(0);
    setIsActive(true);
  };

  if (!isOpen) return null;

  const phaseInstruction = {
    inhale: 'Breathe in slowly through your nose...',
    hold: 'Gently hold your breath...',
    exhale: 'Slowly release through your mouth...',
  }[phase];

  const circleScale = {
    inhale: 1.35,
    hold: 1.35,
    exhale: 0.85,
  }[phase];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3C3833]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#FDFCFB] text-[#3C3833] rounded-3xl max-w-md w-full p-8 sm:p-10 shadow-2xl border border-[#EEECE8] relative flex flex-col items-center text-center"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8C8881] hover:text-[#3C3833] p-2 rounded-full hover:bg-[#F7F6F3] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#829281] mb-2">
          <Wind className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
            4-7-8 Breath Work
          </span>
        </div>

        <h3 className="text-2xl font-serif text-[#3C3833] mb-1">Center Your Mind</h3>
        <p className="text-xs text-[#8C8881] mb-6">A moment to ground your nervous system before writing.</p>

        {/* Breathing Visualizer */}
        <div className="relative w-52 h-52 flex items-center justify-center my-4">
          <motion.div
            animate={{
              scale: circleScale,
              opacity: phase === 'hold' ? 0.9 : 0.7,
            }}
            transition={{
              duration: phase === 'inhale' ? 4 : phase === 'hold' ? 0.2 : 8,
              ease: phase === 'exhale' ? 'easeOut' : 'easeInOut',
            }}
            className="absolute inset-4 rounded-full bg-[#E8E6E1] border border-[#D6D3D1] transition-colors duration-1000 shadow-sm"
          />

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-5xl font-mono font-light text-[#3C3833] tracking-tight">
              {countdown}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C8881] mt-1">
              {phase}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[#5C5852] font-serif text-sm h-12 flex items-center justify-center italic px-4"
          >
            {phaseInstruction}
          </motion.p>
        </AnimatePresence>

        <div className="text-xs text-[#A8A29D] mb-6 font-mono">
          Cycles completed: {cyclesCompleted}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3C3833] hover:bg-black text-white text-xs font-medium transition-colors shadow-xs"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={reset}
            title="Reset exercise"
            className="p-2.5 rounded-full bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#5C5852] hover:text-[#3C3833] transition-colors border border-[#EEECE8]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
