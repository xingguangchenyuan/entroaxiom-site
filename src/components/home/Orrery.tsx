import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { worlds, type World, type WorldKey } from '../../config/worlds';
import { Galaxy, type LabelFrame } from '../../lib/galaxy';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export interface PlanetStat {
  count: number;
  /** 最近更新日期（YYYY-MM-DD） */
  latest?: string;
  /** 这一栏的数据读取失败：标签显示「暂时无法读取」，而不是一直停在「轨道校准中」 */
  failed?: boolean;
}

interface Props {
  stats?: Partial<Record<WorldKey, PlanetStat>>;
}

/** 标签里的英文副标题 */
const LABEL_EN: Record<WorldKey, string> = {
  files: 'LIBRARY',
  shelf: 'MEDIA',
  notes: 'NOTES',
  essays: 'ESSAYS',
  guestbook: 'GUESTBOOK',
};

const UNIT: Record<WorldKey, string> = { essays: '篇', notes: '篇', shelf: '部', files: '份', guestbook: '条' };

/** 胶囊宽度（galaxy.ts 的 labelMetrics 报同一个数），用来判断展开行该往哪边排 */
const LABEL_W = 96;
/** 展开行（拉丁副名 + 计数 + 时间）的近似宽度，同上，只用于贴边判定 */
const META_W = 220;
/** 换边时左边线滑过去的时间常数（秒）：比公转快得多，又不至于看出「跳」 */
const MIX_EASE = 0.45;

/** 相对日期：今天 / 昨天 / N 天前 / N 个月前 */
function ago(date?: string): string {
  if (!date) return '暂无更新';
  const then = new Date(`${date}T00:00:00`);
  if (Number.isNaN(then.getTime())) return '暂无更新';
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return '今天更新';
  if (days === 1) return '昨天更新';
  if (days < 30) return `${days} 天前更新`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前更新`;
  return `${Math.floor(months / 12)} 年前更新`;
}

/**
 * 星系：一颗星核 + 五条共面椭圆轨道。
 * 画在 canvas 上（静态层预渲染，逐帧只画运动部件）；标签是 DOM，位置每帧同步，
 * 所以文字始终按设备像素渲染、可选中、可聚焦，也自带读屏所需的链接语义。
 */
export function Orrery({ stats }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galaxyRef = useRef<Galaxy | null>(null);
  const slots = useRef(new Map<WorldKey, HTMLLIElement>());
  /** 每个胶囊的实测宽度：锚点在左/右哪一侧，要靠它换算成左边线 */
  const widths = useRef(new Map<WorldKey, number>());
  /** 换边时的插值量：1 = 从锚点向右展开，0 = 向左展开，中间值是滑过去的过渡态 */
  const sideMix = useRef(new Map<WorldKey, number>());
  const mixAt = useRef(0);
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const byKey = useMemo(() => new Map(worlds.map((w) => [w.key, w])), []);

  /* 标签位置：直接写 style，不触发 React 重渲染 */
  const applyLabels = useCallback((frames: LabelFrame[]) => {
    const S = wrapRef.current?.clientWidth ?? 0;
    // 换边的插值按真实时间推进（不是按帧）：帧率低的时候不至于一步跨一大截
    const now = performance.now();
    const dtm = Math.min(0.12, Math.max(0, (now - mixAt.current) / 1000));
    mixAt.current = now;
    const mixK = dtm > 0 ? 1 - Math.exp(-dtm / MIX_EASE) : 1;
    for (const f of frames) {
      const el = slots.current.get(f.key);
      if (!el) continue;
      // 量一次胶囊宽度就够了（文字不随位置变），尺寸变化时由 measure() 清掉重量
      let w = widths.current.get(f.key);
      if (!w) {
        const label = el.firstElementChild as HTMLElement | null;
        w = label?.offsetWidth || LABEL_W;
        widths.current.set(f.key, w);
      }
      // 锚点在行星哪一侧，胶囊就从哪一侧展开。换边时不能让 transform 的基准「啪」地翻过去
      // （那会整块跳一个胶囊宽），而是把左边线滑过去。
      const target = f.side === 1 ? 1 : 0;
      const from = sideMix.current.get(f.key) ?? target;
      const mix = reducedRef.current || Math.abs(target - from) < 0.004
        ? target
        : from + (target - from) * mixK;
      sideMix.current.set(f.key, mix);
      const left = f.x - w * (1 - mix);
      el.style.transform = `translate3d(${left.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`;
      el.style.opacity = f.alpha.toFixed(3);
      el.dataset.side = String(f.side);
      el.dataset.active = f.active ? 'true' : 'false';
      el.dataset.dim = f.dimmed ? 'true' : 'false';
      // 展开的那行比胶囊宽得多，贴着右边缘时向右展开会被裁掉，改成从右边往左排
      el.dataset.meta = S > 0 && left + META_W > S - 4 ? 'r' : 'l';
      // 用 pointer-events 而不是 visibility 做「转到背面就点不到」：
      // .stage[inert] 是靠 visibility:hidden 把整个舞台藏起来的，行内 visibility:visible
      // 会把它顶穿——欢迎层还在显示时，首页还没露面，模块名却飘在星海上。
      // 透明度已经由上一行的 opacity 控制，这里只负责命中测试。
      el.style.pointerEvents = f.alpha < 0.02 ? 'none' : 'auto';
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const galaxy = new Galaxy(canvas, {
      reduced,
      mobile: window.matchMedia('(max-width: 720px)').matches,
      // 断点与 mobile.css 对齐：≤860px 时标签被压成一行胶囊，让位算法要知道它更高。
      // 桌面也是同一套胶囊（圆点 + 中文，拉丁副名挪进展开行），实测最宽 96、高 30——
      // 报小了会让两个标签叠在一起，报大了会把标签推到离星球很远的地方。
      labelMetrics: () => (window.innerWidth <= 860 ? { w: 96, h: 38 } : { w: 96, h: 30 }),
      // 手机首页底部有常驻的轨道坞（.dock，约 60px 高 + 安全区）。星系铺满宽度后，
      // 最下面那颗行星的标签正好落在坞下面点不到，所以把这截重叠量出来让开
      // （galaxy.ts 会把它夹到舞台的 40% 以内，窄屏上不至于把整张图压扁）。
      bottomReserve: () => {
        if (window.innerWidth > 860) return 0;
        const dock = document.querySelector('.dock');
        if (!dock) return 0;
        return Math.max(0, wrap.getBoundingClientRect().bottom - dock.getBoundingClientRect().top);
      },
      onLabels: applyLabels,
    });
    galaxyRef.current = galaxy;

    const measure = () => {
      const size = wrap.clientWidth;
      if (size > 0) galaxy.resize(size, window.devicePixelRatio || 1);
      // 字号/断点变了，胶囊宽度要重量
      widths.current.clear();
    };
    measure();
    // 只在「页面可见 且 星系在视口内」时运行：滚过首屏、切到别的标签页都暂停，不再白白占用 CPU/GPU
    let inView = true;
    let started = false;
    const sync = () => {
      const shouldRun = inView && !document.hidden;
      if (shouldRun && !started) {
        started = true;
        galaxy.start();
      } else if (!shouldRun && started) {
        started = false;
        galaxy.stop();
      }
    };
    sync();

    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      (entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin: '80px' },
    );
    io?.observe(wrap);

    document.addEventListener('visibilitychange', sync);

    return () => {
      document.removeEventListener('visibilitychange', sync);
      io?.disconnect();
      ro.disconnect();
      galaxy.stop();
      galaxyRef.current = null;
    };
  }, [applyLabels, reduced]);

  /* 指针视差 + 画布上的命中测试 */
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const galaxy = galaxyRef.current;
    const wrap = wrapRef.current;
    if (!galaxy || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    galaxy.setPointer(nx, ny);
    if (e.pointerType === 'touch') return;
    const hitKey = galaxy.hit(e.clientX - rect.left, e.clientY - rect.top);
    galaxy.setHovered(hitKey);
    // 悬到星球上就给个手型，告诉人这是能点进去的
    if (hitKey) wrap.dataset.hover = hitKey;
    else delete wrap.dataset.hover;
  };

  /** 点中星球：立刻进路由，中间不加过渡动画 */
  const go = useCallback((key: WorldKey) => {
    const w = byKey.get(key);
    if (w) navigate(w.path);
  }, [byKey, navigate]);

  /** 画布上直接点星球：只要悬停已高亮，点一次就进去 */
  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.gx__label')) return; // 标签本身是 <Link>，点击由路由处理
    const galaxy = galaxyRef.current;
    const wrap = wrapRef.current;
    if (!galaxy || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const key = galaxy.hit(e.clientX - rect.left, e.clientY - rect.top);
    if (!key) return;
    go(key);
  };

  const onPointerLeave = () => {
    galaxyRef.current?.setPointer(0, 0);
    galaxyRef.current?.setHovered(null);
    if (wrapRef.current) delete wrapRef.current.dataset.hover;
  };

  /** 移动端：轻点在行星上先选中（展开标签），再点一次才进入 */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    const galaxy = galaxyRef.current;
    const wrap = wrapRef.current;
    if (!galaxy || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const hitKey = galaxy.hit(e.clientX - rect.left, e.clientY - rect.top);
    if (!hitKey) {
      galaxy.setHovered(null);
      delete wrap.dataset.selected;
      return;
    }
    const current = wrap.dataset.selected;
    if (current === hitKey) {
      go(hitKey);
    } else {
      wrap.dataset.selected = hitKey;
      galaxy.setHovered(hitKey);
    }
  };

  const metaFor = (key: WorldKey) => {
    const s = stats?.[key];
    if (s?.failed) return '暂时无法读取';
    if (!s || s.count == null) return '轨道校准中';
    return `共 ${s.count} ${UNIT[key]} · ${ago(s.latest)}`;
  };

  const ariaFor = (w: World) => {
    const s = stats?.[w.key];
    if (s?.failed) return `${w.module}，数据暂时无法读取。${w.motto}`;
    if (!s || s.count == null) return `${w.module}：${w.motto}`;
    return `${w.module}，共 ${s.count} ${UNIT[w.key]}，${ago(s.latest)}。${w.motto}`;
  };

  return (
    <div
      className="gx"
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onClick={onCanvasClick}
    >
      <canvas ref={canvasRef} className="gx__canvas" aria-hidden="true" />
      <ul className="gx__labels" role="list" aria-label="星系中的五个模块">
        {worlds.map((w) => (
          <li
            key={w.key}
            className="gx__slot"
            ref={(el) => {
              if (el) slots.current.set(w.key, el);
              else slots.current.delete(w.key);
            }}
          >
            <Link
              to={w.path}
              className="gx__label"
              style={{ '--c': w.color } as CSSProperties}
              aria-label={ariaFor(w)}
              onMouseEnter={() => galaxyRef.current?.setHovered(w.key)}
              onMouseLeave={() => galaxyRef.current?.setHovered(null)}
              onFocus={() => galaxyRef.current?.setHovered(w.key)}
              onBlur={() => galaxyRef.current?.setHovered(null)}
            >
              <span className="gx__row">
                <span className="gx__dot" style={{ background: w.color }} aria-hidden="true" />
                <span className="gx__zh">{w.module}</span>
              </span>
              {/* 拉丁副名不再占胶囊宽度：胶囊按手机端的做法只留中文，
                  副名挪到选中后展开的那行里，信息没丢，标签却能贴着星球站。 */}
              <span className="gx__meta">
                <span className="gx__meta-en latin" aria-hidden="true">
                  {LABEL_EN[w.key]}
                </span>{' '}
                {metaFor(w.key)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
