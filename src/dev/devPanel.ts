import type { Game } from '@/game/game';
import { el } from '@/ui/dom';

/**
 * Development only (main.ts loads it in dev builds): frame rate, quality tier, draw calls and soldiers on the field. Shown only with `?dev`,
 * so playing the dev build looks like the real game; never part of a Poki build. Jump links (`?battle=N`) arrive
 * with battles in M3.
 */
export class DevPanel {
  constructor(game: Game, root: HTMLElement) {
    if (!new URLSearchParams(location.search).has('dev')) return;
    const panel = el('div', 'dev-panel', root);
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    let frames = 0;
    let since = performance.now();
    const tick = (): void => {
      frames += 1;
      const now = performance.now();
      if (now - since > 1000) {
        const fps = Math.round((frames * 1000) / (now - since));
        const soldiers = game.crowd ? ` · ${game.crowd.sim.count} soldiers` : '';
        panel.textContent = `${fps} fps · ${game.stage.tier} · ${game.stage.renderer.info.render.calls} calls${soldiers}`;
        frames = 0;
        since = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
