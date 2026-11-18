export type Theme = 'light' | 'graphite';

const KEY = 'bushka:pwa:theme:v1';
const themeColor: Record<Theme, string> = { light: '#f5f5f7', graphite: '#171717' };

export function loadTheme(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'graphite' ? 'graphite' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'graphite') root.setAttribute('data-theme', 'graphite');
  else root.removeAttribute('data-theme');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme]);
}

export function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // non-critical
  }
}
