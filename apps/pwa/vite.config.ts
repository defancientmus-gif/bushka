import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_BUILD, APP_VERSION } from './src/lib/version';

// Stamp the built service worker with the current build (so its cache name
// changes every release) and emit a tiny version.json the running app polls
// on launch to force-refresh past a stale cache.
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      const sw = resolve(dist, 'sw.js');
      if (existsSync(sw)) {
        const stamped = readFileSync(sw, 'utf8')
          .replace(/__APP_VERSION__/g, APP_VERSION)
          .replace(/__APP_BUILD__/g, String(APP_BUILD));
        writeFileSync(sw, stamped);
      }
      writeFileSync(resolve(dist, 'version.json'), JSON.stringify({ version: APP_VERSION, build: APP_BUILD }));
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
