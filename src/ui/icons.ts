/** Inline SVG icons, drawn on a 24-unit grid with `currentColor`, so they scale with the HUD and take its colour. */
const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${body}</svg>`;

/** A picture icon (a white silhouette's data URL, `renderGunIcons`) painted in `currentColor` through a mask. */
export const gunArt = (url: string): string =>
  `<span class="gun-art" aria-hidden="true" style="-webkit-mask-image:url('${url}');mask-image:url('${url}')"></span>`;

export const ICONS = {
  pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1.4"/><rect x="14" y="4.5" width="4" height="15" rx="1.4"/>'),
  grenade: svg(
    '<path d="M9.5 3h5v2.2h-5z"/><path d="M15 5.4l3.3-1.6.8 1.7-3 1.5z"/>' +
      '<ellipse cx="12" cy="14" rx="6.2" ry="7.2"/>',
  ),
  support: svg(
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
      '<circle cx="12" cy="12" r="2.6"/><path d="M11 1.5h2v5h-2zM11 17.5h2v5h-2zM1.5 11h5v2h-5zM17.5 11h5v2h-5z"/>',
  ),
  /** The Sentry Gun: a turret on a tripod. */
  sentry: svg(
    '<rect x="6" y="5.5" width="9" height="6" rx="1.2"/><path d="M14.5 7.3h7v2.4h-7z"/>' +
      '<path d="M10 11.5h2v3h-2z"/><path d="M10.2 14l1.8.9-4.6 7-1.8-1z"/><path d="M11.8 14l-1.8.9 4.6 7 1.8-1z"/>',
  ),
  gun: svg('<path d="M3 8h15l1.5-1.5H21V11h-6.5l-1 1.5H10l-1.5 6.5H4.5L6 12H3z"/>'),
  coin: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.6"/>'),
  flag: svg('<path d="M5 2.5h2v19H5z"/><path d="M7.5 3.5h12l-3 4.5 3 4.5h-12z"/>'),
  swords: svg(
    '<path d="M4 3l9.2 9.2-1.5 1.5L2.5 4.5V3z"/><path d="M20 3v1.5l-9.2 9.2-1.5-1.5L18.5 3z"/>' +
      '<path d="M5.2 15.7l3.1 3.1-1.4 1.4-1-1-2 2-1.1-1.1 2-2-1-1zM18.8 15.7l1.4 1.4-1 1 2 2-1.1 1.1-2-2-1 1-1.4-1.4z"/>' +
      '<path d="M8.6 14.2l1.4 1.4-2.3 2.3-1.4-1.4zM15.4 14.2l2.3 2.3-1.4 1.4-2.3-2.3z"/>',
  ),
  heart: svg('<path d="M12 21s-8.5-5.3-8.5-11.3A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 3.1C20.5 15.7 12 21 12 21z"/>'),
  crown: svg('<path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5z"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5h-2.2V8a1.8 1.8 0 0 0-3.6 0v2.5z"/>'),
  close: svg('<path d="M6.3 4.9L12 10.6l5.7-5.7 1.4 1.4-5.7 5.7 5.7 5.7-1.4 1.4-5.7-5.7-5.7 5.7-1.4-1.4 5.7-5.7-5.7-5.7z"/>'),
  army: svg('<path d="M12 2l8 3v6.5c0 5-3.4 8.8-8 10.5-4.6-1.7-8-5.5-8-10.5V5z"/>'),
  hero: svg('<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/>'),
  truck: svg('<path d="M2 6h12v10H2z"/><path d="M15 9h4l3 3.5V16h-7z"/><circle cx="6" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>'),
  /** A mouse with arrows round it: look and aim. */
  mouseMove:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="5" width="8" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M12 5v4.5" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M2 12l3-2.5v5zM22 12l-3-2.5v5zM12 1l-2.2 2.4h4.4zM12 23l-2.2-2.4h4.4z"/></svg>',
  /** A mouse with the left button lit: shoot or click. */
  mouseLeft:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M12 3v7" stroke="currentColor" stroke-width="1.4"/><path fill="#f2b632" d="M11.2 3.9A5.2 5.2 0 0 0 6.8 9v.6h4.4z"/></svg>',
  /** The onboarding hand (touch prompts). */
  hand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff8e8" stroke="#2c2a22" stroke-width="1.4" stroke-linejoin="round" d="M9 11V4.8a1.6 1.6 0 0 1 3.2 0V10l.1-1.2a1.5 1.5 0 0 1 3 .1v1.4a1.5 1.5 0 0 1 3 .2v1.2a1.4 1.4 0 0 1 2.8.2V16c0 3.6-2.6 6-6 6h-1.4c-2.2 0-3.6-.9-4.9-2.5L5.1 15.3a1.6 1.6 0 0 1 2.4-2.1L9 14.6z"/></svg>',
  /** Queen Ada (M10's ending): auburn hair, a gold crown and a smile, for her lines. */
  ada:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#9c4a2a" d="M3.6 14.2a8.4 8.4 0 0 1 16.8 0v5.6h-3.2v-5.6zM3.6 14.2v5.6h3.2v-5.6z"/>' +
    '<circle cx="12" cy="13.8" r="6.8" fill="#f0c49a"/><path fill="#9c4a2a" d="M5.2 12.8a6.8 6.8 0 0 1 13.6 0c-2.4-1.5-4.8-2.1-6.8-2.1s-4.4.6-6.8 2.1z"/>' +
    '<path fill="#f2b632" stroke="#b8821c" stroke-width=".6" stroke-linejoin="round" d="M6.6 8.4l.9-4.9 2.6 2.7L12 2.4l1.9 3.8 2.6-2.7.9 4.9z"/>' +
    '<circle cx="9.4" cy="14.6" r="1" fill="#2c2a22"/><circle cx="14.6" cy="14.6" r="1" fill="#2c2a22"/>' +
    '<path d="M9.8 17.4a3 3 0 0 0 4.4 0" fill="none" stroke="#2c2a22" stroke-width="1.2" stroke-linecap="round"/></svg>',
  /** Rosie, the mechanic: a teal cap and a smile, for her speech bubbles. */
  rosie:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="#f0c49a"/><path fill="#2f9e9a" d="M4 11a8 8 0 0 1 16 0z"/>' +
    '<rect x="3" y="10" width="18" height="2.2" rx="1.1" fill="#257f7b"/><circle cx="9" cy="14" r="1" fill="#2c2a22"/><circle cx="15" cy="14" r="1" fill="#2c2a22"/>' +
    '<path d="M9.5 17a3.2 3.2 0 0 0 5 0" fill="none" stroke="#2c2a22" stroke-width="1.2" stroke-linecap="round"/></svg>',
  /** A chevron for screen-edge arrows, pointing right. */
  chevron: svg('<path d="M7 4l9 8-9 8-1.8-1.8L12.5 12 5.2 5.8z"/>'),
  /** The rewarded-video mark (Poki: every rewarded button shows it): a clapperboard. */
  video: svg(
    '<path d="M3 9.5h18V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z"/><path d="M3.2 8L2.6 5.6a1.4 1.4 0 0 1 1-1.7L17.4.6a1.4 1.4 0 0 1 1.7 1l.6 2.3z"/><path d="M9.5 12.5v5.5l4.8-2.75z" fill="#fff" fill-opacity=".9"/>',
  ),
  /** A tall shield: a bullet bounced off one (Shield Wall), and the boss bar. */
  shield: svg('<path d="M12 2l8 3v6.5c0 5-3.4 8.8-8 10.5-4.6-1.7-8-5.5-8-10.5V5z" fill-opacity=".9"/><path d="M12 5.5v13.8" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>'),
  /** The rift crate, for its edge arrow. */
  crate: svg('<path d="M3 7l9-4 9 4v10l-9 4-9-4z" fill-opacity=".85"/><path d="M12 11v10M3 7l9 4 9-4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>'),
  gear: svg(
    '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5.1l-1.9-.4a6.7 6.7 0 0 1-.6 1.5l1.1 1.6-1.8 1.8-1.6-1.1a6.7 6.7 0 0 1-1.5.6l-.4 1.9h-2.6l-.4-1.9a6.7 6.7 0 0 1-1.5-.6l-1.6 1.1-1.8-1.8 1.1-1.6a6.7 6.7 0 0 1-.6-1.5l-1.9-.4v-2.6l1.9-.4c.1-.5.3-1 .6-1.5L5.7 7.2l1.8-1.8 1.6 1.1c.5-.3 1-.5 1.5-.6l.4-1.9h2.6l.4 1.9c.5.1 1 .3 1.5.6l1.6-1.1 1.8 1.8-1.1 1.6c.3.5.5 1 .6 1.5l1.9.4z"/>',
  ),
} as const;
