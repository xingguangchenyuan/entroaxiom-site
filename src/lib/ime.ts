/**
 * 输入法组合输入判断。
 *
 * 拼音/注音等输入法在候选未上屏时，回车、方向键、Esc 都是给输入法用的，不是给页面快捷键用的：
 *  - Chrome / Firefox：keydown 的 isComposing 为 true；
 *  - Safari：compositionend 先于 keydown 触发，此时 isComposing 已是 false，
 *    但 keyCode 仍是 229，所以两个条件都要判。
 */
export function isImeComposing(e: { isComposing?: boolean; keyCode?: number }): boolean {
  return e.isComposing === true || e.keyCode === 229;
}
