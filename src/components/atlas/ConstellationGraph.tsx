import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Entry } from '../../content/corpus';
import type { ContentType } from '../../content/types';
import { worldByKey } from '../../config/worlds';
import { buildGraph } from './layout';

interface Props {
  entries: Entry[];
  /** 紧凑模式：用于首页预览，只显示分类标签，点击进入星图 */
  compact?: boolean;
  hiddenKinds?: ReadonlySet<ContentType>;
  selectedHub?: string | null;
  onSelectHub?: (id: string | null) => void;
  label?: string;
}

/**
 * 星图（SVG）。力导向布局只在数据/画布比例变化时计算一次；
 * 悬停高亮相邻节点，其余变暗；键盘可 Tab 到每颗星并按 Enter 进入。
 */
export function ConstellationGraph({ entries, compact, hiddenKinds, selectedHub, onSelectHub, label = '内容星图' }: Props) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setNarrow(el.clientWidth < 620);
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = narrow ? 600 : 1000;
  const H = narrow ? (compact ? 520 : 760) : compact ? 520 : 640;
  const graph = useMemo(() => buildGraph(entries, W, H), [entries, W, H]);

  const selIdx = selectedHub ? graph.nodes.findIndex((n) => n.id === selectedHub) : -1;
  const focus = hover ?? (selIdx >= 0 ? selIdx : null);
  const near = useMemo(() => {
    if (focus === null) return null;
    const s = new Set<number>([focus]);
    graph.adj[focus]?.forEach((i) => s.add(i));
    // 悬停在内容上时，也点亮它所属枢纽的“同伴”
    return s;
  }, [focus, graph]);

  const tip = hover !== null ? graph.nodes[hover] : null;

  if (graph.nodes.length === 0) return null;

  return (
    <div className={`cg${compact ? ' cg--compact' : ''}`} ref={wrapRef}>
      <svg className="cg__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <g className="cg__edges">
          {graph.edges.map((e, i) => {
            const a = graph.nodes[e.a];
            const b = graph.nodes[e.b];
            const hot = near !== null && near.has(e.a) && near.has(e.b) && (e.a === focus || e.b === focus);
            const hiddenEdge = hiddenKinds && ((a.entry && hiddenKinds.has(a.entry.kind)) || (b.entry && hiddenKinds.has(b.entry.kind)));
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`cg__edge${hot ? ' is-hot' : ''}${near && !hot ? ' is-dim' : ''}${hiddenEdge ? ' is-off' : ''}`} />;
          })}
        </g>
        {graph.nodes.map((n, i) => {
          const isHub = n.type !== 'entry';
          const kind = n.entry?.kind;
          const off = !!(kind && hiddenKinds?.has(kind));
          const dim = near !== null && !near.has(i);
          const cls = ['cg__node', isHub ? `cg__hub cg__hub--${n.type}` : `cg__star cg__star--${kind}`, dim && 'is-dim', off && 'is-off', i === focus && 'is-focus', n.id === selectedHub && 'is-selected'].filter(Boolean).join(' ');
          const style = { ['--ph' as string]: n.phase.toFixed(3) };
          const interactive = !compact && !off;
          const activate = () => {
            if (isHub) onSelectHub?.(n.id === selectedHub ? null : n.id);
            else if (n.entry) navigate(n.entry.to);
          };
          return (
            <g
              key={n.id}
              className={cls}
              style={style}
              transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`}
              {...(interactive
                ? {
                    role: isHub ? 'button' : 'link',
                    tabIndex: 0,
                    'aria-label': isHub ? `${n.label}（${n.deg} 项），点击聚焦` : `${n.entry ? worldByKey[n.entry.kind].module : ''}：${n.label}`,
                    'aria-pressed': isHub ? n.id === selectedHub : undefined,
                    onClick: activate,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activate();
                      }
                    },
                    onMouseEnter: () => setHover(i),
                    onMouseLeave: () => setHover((h) => (h === i ? null : h)),
                    onFocus: () => setHover(i),
                    onBlur: () => setHover((h) => (h === i ? null : h)),
                  }
                : { 'aria-hidden': true })}
            >
              {isHub ? (
                <>
                  <circle className="cg__ring" r={n.r + 5} />
                  <circle className="cg__core" r={n.r * 0.45} />
                  {n.showLabel && (!compact || n.type === 'cat') && (
                    <text className="cg__label" y={-(n.r + 11)} textAnchor="middle">
                      {n.label}
                    </text>
                  )}
                </>
              ) : (
                <>
                  <circle className="cg__halo" r={n.r * 2.8} />
                  <circle className="cg__dot" r={n.r} />
                </>
              )}
              {interactive && <circle className="cg__hit" r={Math.max(14, n.r + 8)} />}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="cg__tip glass glass--sm" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }} role="presentation">
          <p className="cg__tip-title">{tip.label}</p>
          <p className="cg__tip-meta">
            {tip.entry ? `${worldByKey[tip.entry.kind].module}${tip.entry.category ? ` · ${tip.entry.category}` : ''}` : `${tip.deg} 项内容`}
          </p>
        </div>
      )}
    </div>
  );
}
