/**
 * 滚动位置恢复：等页面“长到够高”再滚过去。
 *
 * 列表页的内容是异步取回的：路由刚切换时页面只有骨架屏，高度远不够，
 * 此时 scrollTo(saved) 会被浏览器截到当前最大滚动高度，等内容出来后位置就丢了。
 * 所以这里逐帧检查，能滚到目标位置时才滚；超时后（内容变少了或加载失败）滚到能到的最远处。
 *
 * 浏览器相关能力都从 env 注入，方便在 Node 里用假时钟测试。
 */
export interface ScrollEnv {
  /** 立即（不带平滑动画）滚到纵向位置 y */
  scrollTo(y: number): void;
  /** 当前页面最大可滚动位置（scrollHeight - 视口高度） */
  maxScroll(): number;
  now(): number;
  raf(cb: () => void): number;
  caf(id: number): void;
}

export interface RestoreOptions {
  /** 最长等待时间，默认 2500ms */
  timeoutMs?: number;
  /** 结束时调用一次：reached 表示是否真的滚到了目标位置；被取消时为 false */
  onDone?: (reached: boolean) => void;
}

/** 开始恢复，返回取消函数（取消也会触发 onDone(false)；结束后再调用无效果） */
export function restoreScroll(target: number, env: ScrollEnv, opts: RestoreOptions = {}): () => void {
  const timeout = opts.timeoutMs ?? 2500;
  const start = env.now();
  let id = 0;
  let finished = false;

  const finish = (reached: boolean) => {
    if (finished) return;
    finished = true;
    if (id) env.caf(id);
    opts.onDone?.(reached);
  };

  const step = () => {
    id = 0;
    if (finished) return;
    const max = env.maxScroll();
    if (max >= target - 1) {
      env.scrollTo(target);
      finish(true);
    } else if (env.now() - start >= timeout) {
      env.scrollTo(Math.max(0, max));
      finish(false);
    } else {
      id = env.raf(step);
    }
  };

  step();
  return () => finish(false);
}
