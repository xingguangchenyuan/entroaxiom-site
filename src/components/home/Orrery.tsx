import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  const byKey = useMemo(() => new Map(worlds.map((w) => [w.key, w])), []);

  /* 标签位置：直接写 style，不触发 React 重渲染 */
  const applyLabels = useCallback((frames: LabelFrame[]) => {
    for (const f of frames) {
      const el = slots.current.get(f.key);
      if (!el) continue;
      el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`;
      el.style.opacity = f.alpha.toFixed(3);
      el.dataset.side = String(f.side);
      el.dataset.active = f.active ? 'true' : 'false';
      el.dataset.dim = f.dimmed ? 'true' : 'false';
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
      onLabels: applyLabels,
    });
    galaxyRef.current = galaxy;

    const measure = () => {
      const size = wrap.clientWidth;
      if (size > 0) galaxy.resize(size, window.devicePixelRatio || 1);
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
              <span className="gx__en latin" aria-hidden="true">
                {LABEL_EN[w.key]}
              </span>
              <span className="gx__meta">{metaFor(w.key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
