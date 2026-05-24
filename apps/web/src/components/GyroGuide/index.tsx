import React from 'react';

interface GyroGuideProps {
  progress: number; // 0–360
  speed: 'slow' | 'perfect' | 'fast';
  isComplete: boolean;
}

const CIRCLE_RADIUS = 44;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const SVG_SIZE = 112;

const SPEED_COLORS = {
  slow: '#3b82f6',
  perfect: '#10b981',
  fast: '#f59e0b',
} as const;

const COMPLETE_COLOR = '#f59e0b';
const MAX_DEGREES = 360;

export default function GyroGuide({
  progress,
  speed,
  isComplete,
}: GyroGuideProps): React.ReactElement {
  const clampedProgress = Math.min(progress, MAX_DEGREES);
  const fraction = clampedProgress / MAX_DEGREES;
  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - fraction);

  const strokeColor = isComplete ? COMPLETE_COLOR : SPEED_COLORS[speed];
  const degrees = Math.round(clampedProgress);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        aria-label={`Progresso de rotação: ${degrees} graus`}
        role="progressbar"
        aria-valuenow={degrees}
        aria-valuemin={0}
        aria-valuemax={MAX_DEGREES}
      >
        {/* Track */}
        <circle
          cx={SVG_SIZE / 2}
          cy={SVG_SIZE / 2}
          r={CIRCLE_RADIUS}
          fill="rgba(0,0,0,0.4)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="8"
        />

        {/* Progress arc */}
        <circle
          cx={SVG_SIZE / 2}
          cy={SVG_SIZE / 2}
          r={CIRCLE_RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SVG_SIZE / 2} ${SVG_SIZE / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.2s ease, stroke 0.3s ease',
          }}
        />

        {/* Degree label */}
        <text
          x={SVG_SIZE / 2}
          y={SVG_SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize="16"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {degrees}°
        </text>

        {/* Complete checkmark */}
        {isComplete && (
          <text
            x={SVG_SIZE / 2}
            y={SVG_SIZE / 2 + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill={COMPLETE_COLOR}
            fontSize="11"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            ✓ 360°
          </text>
        )}
      </svg>
    </div>
  );
}
