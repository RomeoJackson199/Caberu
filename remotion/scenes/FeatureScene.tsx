import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

interface FeatureSceneProps {
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  icon,
  title,
  description,
  gradient,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon animation
  const iconScale = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 200,
    },
  });

  const iconRotation = interpolate(frame, [0, 30], [0, 360], {
    extrapolateRight: 'clamp',
  });

  // Title animation
  const titleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleX = interpolate(frame, [15, 30], [-50, 0], {
    extrapolateRight: 'clamp',
  });

  // Description animation
  const descOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const descY = interpolate(frame, [30, 45], [30, 0], {
    extrapolateRight: 'clamp',
  });

  // Fade out animation
  const fadeOut = interpolate(frame, [90, 110], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: fadeOut,
      }}
    >
      {/* Gradient accent */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, transparent 0%, ${
            gradient.includes('blue') ? 'rgba(59, 130, 246, 0.1)' :
            gradient.includes('purple') ? 'rgba(168, 85, 247, 0.1)' :
            gradient.includes('green') ? 'rgba(34, 197, 94, 0.1)' :
            'rgba(249, 115, 22, 0.1)'
          } 100%)`,
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '1200px',
          padding: '0 80px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '150px',
            marginBottom: '50px',
            transform: `scale(${iconScale}) rotate(${iconRotation}deg)`,
            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))',
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            marginBottom: '30px',
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '40px',
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            lineHeight: 1.6,
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
          }}
        >
          {description}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(frame, [40, 60], [0, 400], {
              extrapolateRight: 'clamp',
            }),
            height: '4px',
            background: gradient.includes('blue') ? 'linear-gradient(90deg, #3B82F6, #06B6D4)' :
                       gradient.includes('purple') ? 'linear-gradient(90deg, #A855F7, #EC4899)' :
                       gradient.includes('green') ? 'linear-gradient(90deg, #22C55E, #10B981)' :
                       'linear-gradient(90deg, #F97316, #EF4444)',
            marginTop: '40px',
            borderRadius: '2px',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
