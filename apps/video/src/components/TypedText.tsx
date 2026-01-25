import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface TypedTextProps {
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  color?: string;
  showCursor?: boolean;
}

export const TypedText: React.FC<TypedTextProps> = ({
  text,
  startFrame,
  charsPerFrame = 0.8,
  color = '#e6edf3',
  showCursor = false,
}) => {
  const frame = useCurrentFrame();

  const relativeFrame = Math.max(0, frame - startFrame);
  const charsToShow = Math.floor(relativeFrame * charsPerFrame);
  const displayText = text.slice(0, Math.min(charsToShow, text.length));
  const isComplete = charsToShow >= text.length;

  const cursorOpacity = interpolate(frame % 30, [0, 15, 30], [1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <span style={{ color }}>
      {displayText}
      {showCursor && !isComplete && (
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 20,
            backgroundColor: '#e6edf3',
            marginLeft: 2,
            opacity: cursorOpacity,
            verticalAlign: 'middle',
          }}
        />
      )}
    </span>
  );
};
