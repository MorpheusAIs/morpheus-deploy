'use client';

import { useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { CyberpunkHero } from './cyberpunk-hero';

interface RiveHeroProps {
  riveSrc?: string;
  stateMachine?: string;
  onAnimationComplete?: () => void;
}

export function RiveHero({
  riveSrc = '/morpheus-intro.riv',
  stateMachine = 'CyberpunkIntroMachine',
  onAnimationComplete,
}: RiveHeroProps) {
  const [riveError, setRiveError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const { RiveComponent } = useRive({
    src: riveSrc,
    stateMachines: stateMachine,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
    onLoadError: () => {
      setRiveError(true);
      setShowFallback(true);
    },
  });

  if (showFallback || riveError) {
    return <CyberpunkHero onAnimationComplete={onAnimationComplete} />;
  }

  return (
    <div className="relative min-h-screen bg-black">
      <RiveComponent className="absolute inset-0 w-full h-full" />
    </div>
  );
}
