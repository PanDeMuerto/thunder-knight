import { PokiAdapter } from './pokiAdapter';
import { WebAdapter } from './webAdapter';
import type { PlatformAdapter } from './types';

declare const __PLATFORM__: 'poki' | 'web' | 'dev';

export async function createPlatform(): Promise<PlatformAdapter> {
  if (__PLATFORM__ === 'poki') return new PokiAdapter();
  if (__PLATFORM__ === 'web') return new WebAdapter();
  // Dynamic import keeps the mock out of production builds.
  const { DevAdapter } = await import('./devAdapter');
  return new DevAdapter();
}
