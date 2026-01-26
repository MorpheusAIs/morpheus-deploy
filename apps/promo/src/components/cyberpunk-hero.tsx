'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GlitchTextProps {
  text: string;
  delay?: number;
  className?: string;
}

function GlitchText({ text, delay = 0, className = '' }: GlitchTextProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(1);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), delay * 1000);
    const intensityTimer = setTimeout(() => setGlitchIntensity(0.3), (delay + 0.5) * 1000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(intensityTimer);
    };
  }, [delay]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={`relative ${className}`}
    >
      <span
        className="glitch-text"
        data-text={text}
        style={
          {
            '--glitch-intensity': glitchIntensity,
          } as React.CSSProperties
        }
      >
        {text}
      </span>
    </motion.div>
  );
}

function ScanLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-glitch-cyan/30 to-transparent"
        initial={{ top: '-10%' }}
        animate={{ top: '110%' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <div className="absolute inset-0 scanlines opacity-20" />
    </div>
  );
}

function GlitchOverlay() {
  const [glitchFrame, setGlitchFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitchFrame((prev) => prev + 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const glitchBars = Array.from({ length: 5 }, (_, i) => ({
    id: `${glitchFrame}-${i}`,
    top: Math.random() * 100,
    height: Math.random() * 3 + 1,
    color: Math.random() > 0.5 ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 0, 255, 0.1)',
    offset: (Math.random() - 0.5) * 10,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence mode="popLayout">
        {glitchBars.map((bar) => (
          <motion.div
            key={bar.id}
            className="absolute left-0 right-0"
            style={{
              top: `${bar.top}%`,
              height: `${bar.height}px`,
              backgroundColor: bar.color,
              transform: `translateX(${bar.offset}px)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface CyberpunkHeroProps {
  onAnimationComplete?: () => void;
}

export function CyberpunkHero({ onAnimationComplete }: CyberpunkHeroProps) {
  const [phase, setPhase] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => {
        setShowContent(true);
        onAnimationComplete?.();
      }, 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onAnimationComplete]);

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-background" />

      <ScanLines />
      <GlitchOverlay />

      <div className="relative z-10 text-center px-4">
        <AnimatePresence>
          {phase >= 1 && (
            <GlitchText
              text="MORPHEUS"
              delay={0}
              className="text-4xl sm:text-6xl md:text-8xl font-bold text-white tracking-wider mb-2"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <GlitchText
              text="DEPLOY"
              delay={0}
              className="text-5xl sm:text-7xl md:text-9xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 tracking-tight"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8"
            >
              <span className="inline-block px-4 py-2 border border-teal-500/30 rounded-full text-teal-400 text-sm sm:text-base font-mono">
                DECENTRALIZED INFRASTRUCTURE
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 4 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              One-click deployments for AI agents, MCP servers, and web apps.
              <br />
              <span className="text-teal-400">Pay with crypto</span>, deploy on{' '}
              <span className="text-teal-400">sovereign compute</span>.
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a
                href="#features"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-lg font-medium text-white shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Get Started
              </a>
              <a
                href="https://github.com/morpheusais/morpheus-deploy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-lg font-medium hover:bg-card transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
