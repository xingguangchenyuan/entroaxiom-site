type MaybeInert = HTMLElement & { inert?: boolean };

/** 带这个属性的兄弟节点（弹层的点击遮罩）不设 inert，否则点遮罩关闭会失效 */
export const SCRIM_ATTR = 'data-overlay-scrim';

/**
 * 让「弹层以外的整个页面」不可聚焦、读屏忽略（inert）：
 * 从弹层容器一路向上，把每一层的兄弟节点都设为 inert，弹层自己和它的祖先不受影响。
 * 这样 aria-modal 在不完全支持它的读屏器上也成立，Tab 也不会跑到背景里。
 * 已经是 inert 的节点（比如欢迎层期间的 stage）不动，也不会在恢复时被改回去。
 * 返回恢复函数。
 */
export function inertBackground(container: HTMLElement, root: HTMLElement = document.body): () => void {
  const changed: MaybeInert[] = [];
  let node: HTMLElement | null = container;
  while (node && node !== root) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      const el = sibling as MaybeInert;
      if (el.inert || el.hasAttribute(SCRIM_ATTR)) continue;
      el.inert = true;
      changed.push(el);
    }
    node = parent;
  }
  return () => {
    for (const el of changed) el.inert = false;
  };
}
