import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface TerminalWindowProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  children,
  width = 900,
  height = 500,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 100 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#0d1117',
        borderRadius: 16,
        border: '1px solid rgba(30, 41, 59, 0.5)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(20, 184, 166, 0.1)',
        overflow: 'hidden',
        transform: `scale(${scale})`,
        opacity,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(30, 41, 59, 0.3)',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'rgba(234, 179, 8, 0.8)',
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
          }}
        />
        <span
          style={{
            marginLeft: 10,
            fontSize: 16,
            color: '#8b949e',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          morpheus-deploy
        </span>
      </div>

      <div
        style={{
          padding: 28,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20,
          lineHeight: 1.7,
          height: height - 60,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
