import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

import { TypedText } from './TypedText';

export type LineType = 'command' | 'output' | 'success' | 'error' | 'info';

interface TerminalLineProps {
  type: LineType;
  content: string;
  startFrame: number;
  typed?: boolean;
  charsPerFrame?: number;
}

const lineColors: Record<LineType, string> = {
  command: '#e6edf3',
  output: '#8b949e',
  success: '#4ade80',
  error: '#f87171',
  info: '#2dd4bf',
};

export const TerminalLine: React.FC<TerminalLineProps> = ({
  type,
  content,
  startFrame,
  typed = true,
  charsPerFrame = 0.8,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (frame < startFrame) {
    return null;
  }

  return (
    <div style={{ opacity, marginBottom: 4 }}>
      {type === 'command' && <span style={{ color: '#2dd4bf' }}>$ </span>}
      {typed ? (
        <TypedText
          text={content}
          startFrame={startFrame}
          charsPerFrame={charsPerFrame}
          color={lineColors[type]}
          showCursor={type === 'command'}
        />
      ) : (
        <span style={{ color: lineColors[type] }}>{content}</span>
      )}
    </div>
  );
};
