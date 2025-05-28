import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'kiaan-voice-orb.min.js',
        assetFileNames: ({ name }) => {
          if (/\.css$/.test(name)) {
            return 'kiaan-voice-orb.min.css';
          }
          return 'assets/[name].[ext]';
        },
      },
    },
  },
});