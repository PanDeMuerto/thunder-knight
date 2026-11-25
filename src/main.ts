import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-ext-500.css';
import '@fontsource/fredoka/latin-ext-600.css';
import './ui/styles.css';
import './ui/battle.css';
import './ui/guide.css';
import { currentLanguage, SUPPORTED_LANGUAGES, setLanguage, t } from './content/strings';
import { POKI_PILL } from './content/tuning';
import { Game } from './game/game';
import { createPlatform } from './platform/createPlatform';
import { PlatformSession } from './platform/platformSession';
import { SaveStore } from './save/saveStore';

declare const __PLATFORM__: 'poki' | 'web' | 'dev';

declare global {
  interface Window {
    /** Exposed in development only, for the automated QA runs. */
    __game?: Game;
    __t?: typeof t;
  }
}

/**
 * Boot order (tech design §3): save → platform session → language → game load → `loadingFinished` → start. The first
 * frame after loading is the battlefield: no title screen (docs/onboarding.md §1).
 */
async function boot(): Promise<void> {
  const root = document.getElementById('game')!;
  const fill = document.getElementById('load-fill')!;
  const loading = document.getElementById('loading')!;
  const setProgress = (fraction: number): void => {
    fill.style.transform = `scaleX(${Math.max(0.04, fraction)})`;
  };

  const store = SaveStore.fromWindow();
  // Hooks are forwarded later, because the game needs the session before it exists.
  const adHooks = { onAdStart: () => {}, onAdEnd: () => {} };
  const session = new PlatformSession(await createPlatform(), {
    onAdStart: () => adHooks.onAdStart(),
    onAdEnd: () => adHooks.onAdEnd(),
  });
  await session.init();

  const settings = store.loadSettings();
  const language = settings.language ?? session.language() ?? 'en';
  setLanguage(SUPPORTED_LANGUAGES.includes(language) ? language : 'en');
  document.documentElement.lang = currentLanguage();

  const game = new Game(session, store, root);
  adHooks.onAdStart = () => game.onAdStart();
  adHooks.onAdEnd = () => game.onAdEnd();
  await game.load(setProgress);

  const placePill = (): void => {
    const pill = root.classList.contains('is-portrait') ? POKI_PILL.portrait : POKI_PILL.landscape;
    session.movePill(pill.topPercent, pill.topPx);
  };
  placePill();
  window.addEventListener('resize', placePill);
  session.loadingFinished();
  loading.classList.add('is-done');
  setTimeout(() => loading.remove(), 400);
  game.start();

  if (__PLATFORM__ === 'dev') {
    window.__game = game;
    window.__t = t;
    const { DevPanel } = await import('./dev/devPanel');
    new DevPanel(game, root);
  }
}

/** If the game can't start (no WebGL, say), the loading screen says so instead of waiting forever. */
boot().catch((error: unknown) => {
  console.error(error);
  const loading = document.getElementById('loading');
  if (!loading) return;
  loading.classList.remove('is-done');
  loading.innerHTML = `<div class="load-error">${t('error.start')}</div>`;
});
