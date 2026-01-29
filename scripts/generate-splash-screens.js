#!/usr/bin/env node

/**
 * Generate PWA splash screen images for iOS devices
 * Run with: node scripts/generate-splash-screens.js
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '../public/splash');

// All iOS device splash screen sizes
const splashScreenSizes = [
  // iPhones
  { width: 750, height: 1334, name: 'splash-750x1334.png' },      // iPhone SE, 8, 7, 6s, 6
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' },    // iPhone 8 Plus, 7 Plus, 6s Plus
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },    // iPhone X, XS, 11 Pro, 12 Mini, 13 Mini
  { width: 828, height: 1792, name: 'splash-828x1792.png' },      // iPhone XR, 11
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' },    // iPhone XS Max, 11 Pro Max
  { width: 1170, height: 2532, name: 'splash-1170x2532.png' },    // iPhone 12, 12 Pro, 13, 13 Pro, 14
  { width: 1284, height: 2778, name: 'splash-1284x2778.png' },    // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 1179, height: 2556, name: 'splash-1179x2556.png' },    // iPhone 14 Pro, 15, 15 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796.png' },    // iPhone 14 Pro Max, 15 Plus, 15 Pro Max
  // iPads
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' },    // iPad Mini, Air
  { width: 1668, height: 2224, name: 'splash-1668x2224.png' },    // iPad Pro 10.5"
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' },    // iPad Pro 11"
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' },    // iPad Pro 12.9"
];

// Generate SVG splash screen template
function generateSplashSVG(width, height) {
  // Calculate icon size (about 20% of the smaller dimension)
  const iconSize = Math.min(width, height) * 0.2;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - iconSize * 0.15; // Slightly above center

  // Text positioning
  const textY = iconY + iconSize + iconSize * 0.4;
  const fontSize = Math.min(width, height) * 0.045;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1e40af"/>
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:0.95"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>

  <!-- Centered Icon Container -->
  <g transform="translate(${iconX}, ${iconY})">
    <!-- Icon Background Circle -->
    <circle cx="${iconSize / 2}" cy="${iconSize / 2}" r="${iconSize * 0.45}" fill="rgba(255,255,255,0.1)"/>

    <!-- Tooth Icon - scaled to fit iconSize -->
    <g transform="translate(${iconSize * 0.22}, ${iconSize * 0.18}) scale(${iconSize / 200})">
      <path d="M60 0C26.9 0 0 26.9 0 60v60c0 22.1 11.9 40 30 40s30-17.9 30-40V80c0-11 9-20 20-20s20 9 20 20v40c0 22.1 11.9 40 30 40s30-17.9 30-40V60c0-33.1-26.9-60-60-60z"
            fill="url(#iconGradient)"/>
    </g>
  </g>

  <!-- Brand Name -->
  <text x="${width / 2}" y="${textY}"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="white"
        text-anchor="middle"
        opacity="0.95">Caberu</text>

  <!-- Tagline -->
  <text x="${width / 2}" y="${textY + fontSize * 1.3}"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="${fontSize * 0.5}"
        font-weight="400"
        fill="white"
        text-anchor="middle"
        opacity="0.7">Healthcare Practice Management</text>
</svg>`;
}

async function generateSplashScreens() {
  console.log('🎨 Generating PWA splash screens...\n');

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  for (const size of splashScreenSizes) {
    const svg = generateSplashSVG(size.width, size.height);
    const outputPath = join(outputDir, size.name);

    try {
      await sharp(Buffer.from(svg))
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`✅ Generated: ${size.name} (${size.width}x${size.height})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size.name}:`, error.message);
    }
  }

  console.log('\n✨ Splash screen generation complete!');
  console.log(`📁 Output directory: ${outputDir}`);
}

generateSplashScreens().catch(console.error);
