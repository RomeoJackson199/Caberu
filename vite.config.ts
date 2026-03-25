import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { beasties } from "vite-plugin-beasties";

// Performance-optimized Vite configuration
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && beasties({
      options: {
        // Use media swap to defer non-critical CSS loading
        preload: 'swap',
        // Don't remove unused CSS from source (keep all for SPA)
        pruneSource: false,
        // Reduce blocking by deferring non-critical CSS
        reduceInlineStyles: true,
        // Don't inline fonts - let browser handle font loading
        inlineFonts: false,
        // Add noscript fallback for non-JS users
        noscriptFallback: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers only for smaller bundles
    target: 'es2020',
    // Optimize bundle size with aggressive code splitting
    rollupOptions: {
      output: {
        // Use hashed filenames for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase warning limit since we're code-splitting
    chunkSizeWarningLimit: 500,
    // No source maps in production
    sourcemap: mode === 'development',
    // Better minification with esbuild (faster than terser)
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
    // Inline small assets
    assetsInlineLimit: 4096,
  },
  // Optimize dependencies for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'zod',
      '@tanstack/react-query',
      'framer-motion',
      'mapbox-gl',
      'leaflet',
      'react-leaflet',
    ],
  },
  // Enable CSS optimizations
  css: {
    devSourcemap: false,
  },
  // JSON optimization
  json: {
    stringify: true,
  },
  // esbuild transform options — only drop console/debugger in production.
  // Do NOT set minifyIdentifiers/minifySyntax/minifyWhitespace here; those
  // run per-file during the transform phase and cause identifier conflicts
  // in lazy-loaded chunks when combined with build.minify:'esbuild' (which
  // already minifies the final bundle correctly in one pass).
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
