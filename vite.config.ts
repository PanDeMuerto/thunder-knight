import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/** Adds the Poki SDK script to production Poki builds only, so dev stays offline. */
function pokiSdkScript(mode: string): Plugin {
  return {
    name: 'poki-sdk-script',
    transformIndexHtml() {
      if (mode !== 'poki') return [];
      return [
        {
          tag: 'script',
          attrs: { src: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js' },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __PLATFORM__: JSON.stringify(mode === 'poki' ? 'poki' : mode === 'web' ? 'web' : 'dev'),
  },
  plugins: [pokiSdkScript(mode)],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
