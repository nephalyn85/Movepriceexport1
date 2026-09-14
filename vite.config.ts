import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function copyPublicSkipLocked(): import('vite').Plugin {
  return {
    name: 'copy-public-skip-locked',
    apply: 'build',
    config() {
      return { build: { copyPublicDir: false } };
    },
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');
      function copyDir(src: string, dest: string) {
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          } catch {
            // skip locked or unavailable files
          }
        }
      }
      copyDir(publicDir, distDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicSkipLocked()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
