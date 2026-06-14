export type Theme = 'light' | 'emerald';

const KEY = 'bushka:pwa:theme:v1';
const themeColor: Record<Theme, string> = { light: '#eef1f5', emerald: '#08120e' };

export function loadTheme(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'emerald' ? 'emerald' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'emerald') root.setAttribute('data-theme', 'emerald');
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
