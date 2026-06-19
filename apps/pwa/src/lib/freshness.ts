import { APP_BUILD } from './version';

const GUARD = 'bushka:forced-build';

// Polls version.json (bypasses cache) on launch. If the server has a newer
// build than the running code, the cache is stale — wipe it and reload past it.
// This is the reliable fix for installed PWAs (especially iOS) that cling to
// an old cached version even after a deploy.
export async function checkFreshness() {
  try {
    const base = import.meta.env.BASE_URL || './';
    const response = await fetch(`${base}version.json`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const serverBuild = Number(data?.build);
    if (!Number.isFinite(serverBuild) || serverBuild <= APP_BUILD) return;

    // Guard against a reload loop if something goes sideways.
    if (sessionStorage.getItem(GUARD) === String(serverBuild)) return;
    sessionStorage.setItem(GUARD, String(serverBuild));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    window.location.reload();
  } catch {
    // offline / no version.json — nothing to do
  }
}
