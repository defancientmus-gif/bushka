export const APP_VERSION = '0.2.0';
export const APP_CHANNEL = 'beta';

// Build counter — bump on every noticeable front-end change (shown by the logo).
export const APP_BUILD = 43;

// Beta series tag shown next to the logo, e.g. "v021". Bump APP_BUILD → tag updates.
export const APP_TAG = `v${String(APP_BUILD).padStart(3, '0')}`;
