import { useEffect } from 'react';

/**
 * 天空状态仓库（不走 React state，避免每次切换都重渲染整棵树）
 *  - mode：背景黑洞所处的“姿态”，页面用 useSkyMode 声明
 *  - pulse：进入仪式时的金色闪光
 */
export type SkyMode = 'welcome' | 'home' | 'calm';

interface Store {
  mode: SkyMode;
  pulseAt: number;
  modeListeners: Set<() => void>;
}

const store: Store = { mode: 'welcome', pulseAt: -1, modeListeners: new Set() };

export function setSkyMode(mode: SkyMode): void {
  if (store.mode === mode) return;
  store.mode = mode;
  store.modeListeners.forEach((fn) => fn());
}

export function getSkyMode(): SkyMode {
  return store.mode;
}

export function pulseSky(): void {
  store.pulseAt = performance.now();
  store.modeListeners.forEach((fn) => fn());
}

export function getPulseAt(): number {
  return store.pulseAt;
}

export function subscribeSky(fn: () => void): () => void {
  store.modeListeners.add(fn);
  return () => {
    store.modeListeners.delete(fn);
  };
}

/** 页面声明自己需要的天空姿态 */
export function useSkyMode(mode: SkyMode): void {
  useEffect(() => {
    setSkyMode(mode);
  }, [mode]);
}
