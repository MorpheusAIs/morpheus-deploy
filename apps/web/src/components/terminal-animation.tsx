'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface TerminalLine {
  type: 'command' | 'output' | 'success';
  content: string;
  delay?: number;
}

const terminalLines: TerminalLine[] = [
  { type: 'command', content: 'npx morpheus-deploy init' },
  { type: 'output', content: 'Creating morpheus.yaml...', delay: 800 },
  { type: 'command', content: 'npx morpheus-deploy deploy', delay: 1200 },
  { type: 'success', content: 'Deployed to https://yourproject.akash.network', delay: 1500 },
];

function Cursor({ visible }: { visible: boolean }) {
  return (
    <motion.span
      className="inline-block w-2 h-4 bg-white ml-0.5 align-middle"
      animate={{ opacity: visible ? [1, 0] : 0 }}
      transition={{ duration: 0.5, repeat: visible ? Infinity : 0, repeatType: 'reverse' }}
    />
  );
}

function TypedText({
  text,
  onComplete,
  showCursor,
  speed = 50,
}: {
  text: string;
  onComplete: () => void;
  showCursor: boolean;
  speed?: number;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      onComplete();
    }
  }, [displayedText, text, speed, onComplete]);

  return (
    <>
      {displayedText}
      {showCursor && <Cursor visible={!isComplete || showCursor} />}
    </>
  );
}

export function TerminalAnimation() {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showLine, setShowLine] = useState<boolean[]>([true, false, false, false]);

  useEffect(() => {
    if (currentLineIndex === 0 && !isTyping) {
      setIsTyping(true);
    }
  }, [currentLineIndex, isTyping]);

  const handleLineComplete = () => {
    setCompletedLines((prev) => [...prev, currentLineIndex]);

    const nextIndex = currentLineIndex + 1;
    if (nextIndex < terminalLines.length) {
      const nextLine = terminalLines[nextIndex];
      const delay = nextLine.delay || 300;

      setTimeout(() => {
        setShowLine((prev) => {
          const newState = [...prev];
          newState[nextIndex] = true;
          return newState;
        });
        setCurrentLineIndex(nextIndex);
        setIsTyping(true);
      }, delay);
    }
    setIsTyping(false);
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-white';
      case 'output':
        return 'text-muted-foreground';
      case 'success':
        return 'text-green-400';
    }
  };

  const isLastLine = (index: number) => index === terminalLines.length - 1;
  const shouldShowCursor = (index: number) =>
    currentLineIndex === index && (!completedLines.includes(index) || isLastLine(index));

  return (
    <div className="mt-16 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-1 shadow-2xl max-w-3xl mx-auto">
      <div className="rounded-lg bg-[#0d1117] p-4 font-mono text-sm text-left overflow-x-auto min-h-[140px]">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>

        <AnimatePresence>
          {terminalLines.map((line, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: showLine[index] ? 1 : 0 }}
              className={`${!showLine[index] ? 'hidden' : ''}`}
            >
              {line.type === 'command' && <span className="text-teal-400">$ </span>}
              <span className={getLineColor(line.type)}>
                {completedLines.includes(index) ? (
                  <>
                    {line.content}
                    {isLastLine(index) && <Cursor visible={true} />}
                  </>
                ) : currentLineIndex === index && showLine[index] ? (
                  <TypedText
                    text={line.content}
                    onComplete={handleLineComplete}
                    showCursor={shouldShowCursor(index)}
                    speed={line.type === 'command' ? 40 : 25}
                  />
                ) : null}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
