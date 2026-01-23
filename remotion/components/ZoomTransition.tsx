import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface ZoomTransitionProps {
  children: React.ReactNode;
  type?: 'zoom-in' | 'zoom-out' | 'zoom-focus';
  focusX?: number; // 0-100 percentage
  focusY?: number; // 0-100 percentage
  startFrame?: number;
  duration?: number;
  maxScale?: number;
}

/**
 * ZoomTransition - Creates smooth zoom transitions for dashboard/screen demos
 * Used for focusing on specific UI elements during the video
 */
export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  children,
  type = 'zoom-in',
  focusX = 50,
  focusY = 50,
  startFrame = 0,
  duration = 30,
  maxScale = 2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (adjustedFrame >= 0) {
    const progress = spring({
      frame: adjustedFrame,
      fps,
      from: 0,
      to: 1,
      config: { damping: 25, stiffness: 80 },
      durationInFrames: duration,
    });

    if (type === 'zoom-in') {
      scale = interpolate(progress, [0, 1], [1, maxScale]);
      // Translate to focus point
      translateX = interpolate(progress, [0, 1], [0, (50 - focusX) * (maxScale - 1) * 0.5]);
      translateY = interpolate(progress, [0, 1], [0, (50 - focusY) * (maxScale - 1) * 0.5]);
    } else if (type === 'zoom-out') {
      scale = interpolate(progress, [0, 1], [maxScale, 1]);
      translateX = interpolate(progress, [0, 1], [(50 - focusX) * (maxScale - 1) * 0.5, 0]);
      translateY = interpolate(progress, [0, 1], [(50 - focusY) * (maxScale - 1) * 0.5, 0]);
    } else if (type === 'zoom-focus') {
      // Zoom in then hold
      const zoomProgress = Math.min(progress * 2, 1);
      scale = interpolate(zoomProgress, [0, 1], [1, maxScale]);
      translateX = (50 - focusX) * (scale - 1) * 0.5;
      translateY = (50 - focusY) * (scale - 1) * 0.5;
    }
  }

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
