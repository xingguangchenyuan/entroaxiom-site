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

/* 星云色调：随所在模块变化（随笔偏余烬橙、笔记偏冰青……） */
const DEFAULT_TINT: [number, number, number] = [0.09, 0.05, 0.16];
let tint: [number, number, number] = DEFAULT_TINT;

export function setSkyTint(next?: [number, number, number]): void {
  const t = next ?? DEFAULT_TINT;
  if (t[0] === tint[0] && t[1] === tint[1] && t[2] === tint[2]) return;
  tint = t;
  store.modeListeners.forEach((fn) => fn());
}

export function getSkyTint(): [number, number, number] {
  return tint;
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
