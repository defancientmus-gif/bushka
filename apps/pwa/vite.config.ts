import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_BUILD, APP_VERSION } from './src/lib/version';

// Stamp the built service worker with the current build so its cache name
// changes every release — old caches get cleared, PWA never goes stale.
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const file = resolve(process.cwd(), 'dist', 'sw.js');
      if (!existsSync(file)) return;
      const stamped = readFileSync(file, 'utf8')
        .replace(/__APP_VERSION__/g, APP_VERSION)
        .replace(/__APP_BUILD__/g, String(APP_BUILD));
      writeFileSync(file, stamped);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), stampServiceWorker()],
  server: {
    host: '0.0.0.0',
    port: 8766
  },
  preview: {
    host: '0.0.0.0',
    port: 8767
  }
});
