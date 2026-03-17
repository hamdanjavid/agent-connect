import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': 'window',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
// ... other imports

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/agent-connect/', // YOUR REPO NAME
    plugins: [/* your plugins */],
    define: {
      // Map your OpenRouter key here
      'process.env.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': JSON.stringify(env.OPENROUTER_API_KEY),
      'global': 'window',
    },
    // ... rest of config
  };
});
