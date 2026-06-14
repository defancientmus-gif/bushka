import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, loadTheme } from './lib/theme';
import './styles.css';

applyTheme(loadTheme());

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then(registration => {
          // Check for a newer build on every launch (PWAs can sit cached for days).
          registration.update();
          registration.addEventListener('updatefound', () => {
            const next = registration.installing;
            if (!next) return;
            next.addEventListener('statechange', () => {
              // A new build is ready AND an old one controls the page → apply it.
              if (next.state === 'installed' && navigator.serviceWorker.controller) {
                window.location.reload();
              }
            });
          });
        })
        .catch(() => {});
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then(registrations => registrations.forEach(registration => registration.unregister()))
      .catch(() => {});
  });
}
