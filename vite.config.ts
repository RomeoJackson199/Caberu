import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Performance-optimized Vite configuration
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
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
  // Enable experimental features for better performance
  esbuild: {
    // Remove console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Minify identifiers
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
}));
