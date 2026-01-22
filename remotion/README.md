# Caberu Marketing Video

This directory contains the Remotion project for generating the Caberu marketing video.

## 🎬 Overview

The marketing video is a 30-second promotional video showcasing Caberu's key features:

- **Hero Scene** (5s): Introduces Caberu with animated branding
- **Feature Scenes** (16s): Highlights 4 key features:
  - Smart Scheduling
  - Digital Health Records
  - AI-Powered Assistant
  - Practice Analytics
- **Stats Scene** (4s): Shows impressive statistics and metrics
- **CTA Scene** (5s): Call-to-action with contact information

## 🚀 Quick Start

### Preview the Video

To open the Remotion Studio and preview the video:

```bash
npm run video
```

This will open a browser window where you can:
- Preview the video in real-time
- Scrub through frames
- Adjust composition settings
- See all animations

### Render the Video

To render the final video file:

```bash
npm run video:render
```

This will create a video file at `out/video.mp4`.

## 📁 Project Structure

```
remotion/
├── index.ts              # Entry point that registers compositions
├── Root.tsx              # Registers all video compositions
├── CaberuMarketing.tsx   # Main video composition with all scenes
├── scenes/               # Individual scene components
│   ├── HeroScene.tsx     # Opening/branding scene
│   ├── FeatureScene.tsx  # Reusable feature highlight component
│   ├── StatsScene.tsx    # Statistics showcase
│   └── CTAScene.tsx      # Call-to-action scene
└── README.md            # This file
```

## ⚙️ Customization

### Changing Video Duration

Edit the `durationInFrames` in `remotion/Root.tsx`:

```typescript
durationInFrames={900} // 30 seconds at 30fps
```

### Modifying Scenes

Each scene is a React component in the `scenes/` directory. You can:

1. **Adjust timing**: Modify the `from` and `durationInFrames` props in `CaberuMarketing.tsx`
2. **Change content**: Edit the scene components directly
3. **Add new scenes**: Create new scene components and add them to the sequence

### Customizing Features

To add or modify feature highlights, edit the `Sequence` components in `CaberuMarketing.tsx`:

```typescript
<Sequence from={150} durationInFrames={120}>
  <FeatureScene
    icon="📅"
    title="Your Feature"
    description="Your description"
    gradient="from-blue-500 to-cyan-500"
  />
</Sequence>
```

### Changing Colors and Styles

All scenes use inline styles. You can modify:
- Background gradients
- Text colors and sizes
- Animation timings
- Font families

## 🎨 Animation Details

The video uses Remotion's animation tools:

- **spring()**: For smooth, physics-based animations
- **interpolate()**: For custom animation curves
- **useCurrentFrame()**: To access the current frame for time-based animations

Example:
```typescript
const scale = spring({
  frame: frame - 10,
  fps,
  config: { damping: 100 },
});
```

## 📊 Video Specifications

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 fps
- **Duration**: 30 seconds (900 frames)
- **Format**: MP4 (H.264)
- **Aspect Ratio**: 16:9

## 🎯 Rendering Options

### Custom Output Path

```bash
remotion render remotion/index.ts CaberuMarketing path/to/output.mp4
```

### Different Quality

```bash
remotion render remotion/index.ts CaberuMarketing out/video.mp4 --quality 100
```

### Different Frame Rate

```bash
remotion render remotion/index.ts CaberuMarketing out/video.mp4 --fps 60
```

### Custom Resolution

```bash
remotion render remotion/index.ts CaberuMarketing out/video.mp4 --height 720
```

## 🔧 Troubleshooting

### Video Not Rendering

Make sure you have all dependencies installed:
```bash
npm install
```

### Preview Window Not Opening

Check if port 3000 is available or specify a different port:
```bash
remotion studio remotion/index.ts --port 3001
```

### Slow Rendering

Rendering can be CPU-intensive. To speed it up:
- Close other applications
- Use `--concurrency` flag to control parallel rendering
- Consider using cloud rendering for faster results

## 📚 Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion Examples](https://www.remotion.dev/examples)
- [Animation Best Practices](https://www.remotion.dev/docs/miscellaneous/animation-best-practices)

## 🤝 Contributing

To add new scenes or modify existing ones:

1. Create/edit scene components in `remotion/scenes/`
2. Import and add them to `CaberuMarketing.tsx`
3. Test in Remotion Studio with `npm run video`
4. Render final video with `npm run video:render`

## 📝 Notes

- All animations are programmatic and resolution-independent
- The video is fully customizable through React props
- Each scene is independently reusable
- The composition uses modern React hooks and Remotion APIs
