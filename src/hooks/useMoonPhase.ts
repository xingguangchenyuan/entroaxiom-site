import { useMemo } from 'react';

const SYNODIC = 29.530588853;
/** 参考新月：2000-01-06 18:14 UTC */
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);

const NAMES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];

export interface MoonPhase {
  /** 月龄（天） */
  age: number;
  /** 0..1，0 = 新月，0.5 = 满月 */
  fraction: number;
  illumination: number;
  name: string;
  /** 40×40 视窗、半径 14 的被照亮部分路径 */
  path: string;
}

/** 纯函数，方便测试 */
export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - NEW_MOON_REF) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const f = age / SYNODIC;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * f)) / 2) * 100);
  const name = NAMES[Math.round(f * 8) % 8];

  const r = 14;
  const k = Math.abs(Math.cos(2 * Math.PI * f)) * r;
  const waxing = f < 0.5;
  const crescent = f < 0.25 || f > 0.75;
  // 外缘：盈月亮在右侧（顺时针），亏月亮在左侧
  const limbSweep = waxing ? 1 : 0;
  // 明暗界线：盈月蛾眉时凸向右，盈凸时凸向左；亏月相反
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const path = `M20 ${20 - r} A${r} ${r} 0 0 ${limbSweep} 20 ${20 + r} A${k.toFixed(2)} ${r} 0 0 ${termSweep} 20 ${20 - r}Z`;
  return { age, fraction: f, illumination, name, path };
}

export function useMoonPhase(): MoonPhase {
  return useMemo(() => moonPhase(new Date()), []);
}
