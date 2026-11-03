import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Entry } from '../../content/corpus';
import type { ContentType } from '../../content/types';
import { worldByKey } from '../../config/worlds';

const KINDS: ContentType[] = ['essays', 'notes', 'shelf', 'files'];
const SIZE = 1000;
const C = SIZE / 2;
const R_IN = 90;
const R_OUT = 440;

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export interface Star {
  e: Entry;
  x: number;
  y: number;
  r: number;
  color: string;
}

/**
 * 极坐标星盘布局：
 *  - 角度：按模块分四个扇区（随笔/笔记/书影音/文件），扇区内按 id 哈希散开；
 *  - 半径：时间。越新越靠近中心的“视界”，越久远越往外飘；
 *  - 星等：标签越多越亮。
 */
export function layoutStars(entries: Entry[]): Star[] {
  const dated = entries.map((e) => (e.date ? Date.parse(e.date) : NaN)).filter((t) => !Number.isNaN(t));
  const min = dated.length ? Math.min(...dated) : 0;
  const max = dated.length ? Math.max(...dated) : 1;
  const span = Math.max(1, max - min);
  return entries.map((e) => {
    const k = Math.max(0, KINDS.indexOf(e.kind));
    const h = hash(`${e.kind}:${e.id}`);
    const sector = (Math.PI * 2) / KINDS.length;
    const a = -Math.PI / 2 + k * sector + sector * (0.12 + ((h % 1000) / 1000) * 0.76);
    const t = e.date ? Date.parse(e.date) : NaN;
    const age = Number.isNaN(t) ? 0.95 : 1 - (t - min) / span;
    const jitter = (((h >>> 10) % 100) / 100 - 0.5) * 40;
    const rad = R_IN + 30 + age * (R_OUT - R_IN - 60) + jitter;
    return { e, x: C + Math.cos(a) * rad, y: C + Math.sin(a) * rad, r: 3 + Math.min(4, e.tags.length) * 1.1, color: worldByKey[e.kind].color };
  });
}

interface Props {
  entries: Entry[];
  hidden: Set<ContentType>;
  tag: string | null;
  onTag: (t: string | null) => void;
}

/**
 * 星盘：SVG 圆形星图。悬停/聚焦一颗星时，与它共享标签的星被连成星座；
 * 选择一个标签（来自侧栏）时，该标签下的星全部点亮并按时间顺序连线。
 */
export function StarChart({ entries, hidden, tag, onTag }: Props) {
  const navigate = useNavigate();
  const stars = useMemo(() => layoutStars(entries), [entries]);
  const [hover, setHover] = useState<Star | null>(null);
  const visible = stars.filter((s) => !hidden.has(s.e.kind));

  const lit = useMemo(() => {
    if (tag) return visible.filter((s) => s.e.tags.includes(tag)).sort((a, b) => (a.e.date ?? '').localeCompare(b.e.date ?? ''));
    if (hover) {
      const ts = new Set(hover.e.tags);
      return visible.filter((s) => s === hover || s.e.tags.some((t) => ts.has(t)));
    }
    return [];
  }, [tag, hover, visible]);
  const litSet = new Set(lit);

  const lines: [Star, Star][] = [];
  if (tag) for (let i = 1; i < lit.length; i++) lines.push([lit[i - 1], lit[i]]);
  else if (hover) lit.forEach((s) => s !== hover && lines.push([hover, s]));

  return (
    <div className={`chart${lit.length ? ' is-focused' : ''}`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="chart__svg" role="img" aria-label="内容星盘：角度为模块，半径为时间（越新越靠近中心）">
        <defs>
          <radialGradient id="chart-core">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.7" stopColor="#000" />
            <stop offset="0.86" stopColor="#f7e1a0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ab93ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 同心时间环 */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={R_IN + f * (R_OUT - R_IN)} className="chart__ring" />
        ))}
        {/* 扇区分割与铭文 */}
        {KINDS.map((k, i) => {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / KINDS.length;
          const mid = a + Math.PI / KINDS.length;
          return (
            <g key={k}>
              <line x1={C + Math.cos(a) * R_IN} y1={C + Math.sin(a) * R_IN} x2={C + Math.cos(a) * (R_OUT + 30)} y2={C + Math.sin(a) * (R_OUT + 30)} className="chart__spoke" />
              <text x={C + Math.cos(mid) * (R_OUT + 34)} y={C + Math.sin(mid) * (R_OUT + 34)} className="chart__label" style={{ fill: worldByKey[k].color }} textAnchor="middle" dominantBaseline="middle">
                {worldByKey[k].latin.toUpperCase()} · {worldByKey[k].module}
              </text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={R_IN} fill="url(#chart-core)" className="chart__core" />
        <text x={C} y={C - 6} className="chart__core-t" textAnchor="middle">NUNC</text>
        <text x={C} y={C + 16} className="chart__core-s" textAnchor="middle">此刻</text>

        {lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="chart__line" style={{ stroke: tag ? '#f7e1a0' : a.color }} />
        ))}

        {visible.map((s) => {
          const on = litSet.has(s);
          return (
            <g
              key={`${s.e.kind}:${s.e.id}`}
              className={`chart__star${on ? ' is-lit' : ''}`}
              transform={`translate(${s.x} ${s.y})`}
              style={{ ['--c' as string]: s.color } as CSSProperties}
              tabIndex={0}
              role="link"
              aria-label={`${worldByKey[s.e.kind].module}：${s.e.title}`}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s)}
              onBlur={() => setHover(null)}
              onClick={() => navigate(s.e.to)}
              onKeyDown={(ev) => ev.key === 'Enter' && navigate(s.e.to)}
            >
              <circle r={s.r * 3.2} className="chart__halo" />
              <circle r={s.r} className="chart__dot" />
            </g>
          );
        })}
      </svg>

      <div className="chart__card" aria-live="polite">
        {hover ? (
          <>
            <p className="latin" style={{ color: hover.color }}>{worldByKey[hover.e.kind].latin} · {(hover.e.date ?? '').slice(0, 10)}</p>
            <p className="chart__card-title">{hover.e.title}</p>
            <p className="chart__card-sum">{hover.e.summary}</p>
            {hover.e.tags.length > 0 && (
              <p className="chart__card-tags">
                {hover.e.tags.map((t) => (
                  <button key={t} type="button" className="tag" onClick={() => onTag(t)}>{t}</button>
                ))}
              </p>
            )}
          </>
        ) : tag ? (
          <>
            <p className="latin">Constellatio</p>
            <p className="chart__card-title">「{tag}」座 · {lit.length} 颗星</p>
            <ul className="chart__card-list" role="list">
              {lit.map((s) => (
                <li key={`${s.e.kind}:${s.e.id}`}>
                  <Link to={s.e.to} style={{ ['--c' as string]: s.color } as CSSProperties}>{s.e.title}</Link>
                </li>
              ))}
            </ul>
            <button type="button" className="text-action" onClick={() => onTag(null)}>解散星座</button>
          </>
        ) : (
          <p className="chart__hint">把指针停在一颗星上，它会和共享标签的星连成星座。越靠近中心，越接近此刻。</p>
        )}
      </div>
    </div>
  );
}
