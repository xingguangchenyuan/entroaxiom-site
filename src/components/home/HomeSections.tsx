import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Corpus } from '../../content/corpus';
import { byRecent } from '../../content/corpus';
import type { GuestMessage } from '../../content/types';
import { axioms } from '../../config/axioms';
import { worldByKey } from '../../config/worlds';
import { useInView } from '../../hooks/useInView';
import { useCountUp } from '../../hooks/useCountUp';
import { formatBytes, formatDate } from '../../lib/format';
import { IconArrow, IconShuffle } from '../ui/Icons';
import { Sigil } from '../guestbook/Sigil';
import { Stars } from '../shelf/Stars';
import { ErrorState } from '../state/ErrorState';

/* ---------------- 今日神谕：每天抽一张公理牌 ---------------- */
export function dayIndex(n: number, salt = 0, date = new Date()): number {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate() + salt * 7;
  return ((seed * 2654435761) >>> 0) % n;
}

export function Oracle() {
  const [salt, setSalt] = useState(0);
  const a = axioms[dayIndex(axioms.length, salt)];
  return (
    <section className="oracle" aria-labelledby="oracle-h" style={{ ['--c' as string]: a.color } as CSSProperties}>
      <div className="oracle__card" key={`${a.numeral}-${salt}`}>
        <span className="oracle__numeral latin">{a.numeral}</span>
        <p className="oracle__arcana latin">{a.arcana}</p>
        <h2 id="oracle-h" className="oracle__title display">{a.title}</h2>
        <p className="oracle__gloss">{a.gloss}</p>
      </div>
      <div className="oracle__side">
        <p className="home-kicker latin">Oraculum · 今日神谕</p>
        <p className="oracle__body">{a.body}</p>
        <div className="oracle__actions">
          {a.to && (
            <Link className="text-action" to={a.to}>
              {a.toLabel} <IconArrow size={14} />
            </Link>
          )}
          <button type="button" className="text-action" onClick={() => setSalt((s) => s + 1)}>
            <IconShuffle size={14} /> 再抽一张
          </button>
          <Link className="text-action" to="/axioms">
            全部七张牌
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 区块标题 ---------------- */
function SecHead({ latin, title, to, lead }: { latin: string; title: string; to?: string; lead?: string }) {
  return (
    <header className="home-sec__head">
      <div>
        <p className="home-kicker latin">{latin}</p>
        <h2 className="home-sec__title display">{title}</h2>
        {lead && <p className="home-sec__lead">{lead}</p>}
      </div>
      {to && (
        <Link to={to} className="text-action">
          全部 <IconArrow size={14} />
        </Link>
      )}
    </header>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton__row" aria-hidden="true" />
      ))}
    </>
  );
}

/* ---------------- 随笔：余烬 ---------------- */
export function EssayStrip({ corpus }: { corpus: Corpus | null }) {
  const items = useMemo(() => (corpus ? corpus.entries.filter((e) => e.kind === 'essays').sort(byRecent).slice(0, 3) : []), [corpus]);
  const w = worldByKey.essays;
  return (
    <section className="home-sec" data-hue={w.hue}>
      <SecHead latin={`${w.latin} · ${w.body}`} title="最近的余烬" to={w.path} lead={w.motto} />
      <div className="essay-strip">
        {!corpus && <SkeletonRows n={3} />}
        {items.map((e, i) => (
          <Link key={e.id} to={e.to} className={`essay-card glass glass--interactive lit${i === 0 ? ' essay-card--lead' : ''}`}>
            <span className="essay-card__date readout">{formatDate(undefined, e.date)}</span>
            <h3 className="essay-card__title display">{e.title}</h3>
            <p className="essay-card__sum">{e.summary}</p>
            <span className="tag">{e.category ?? '随笔'}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 笔记：冰卫星 ---------------- */
export function NoteLedger({ corpus }: { corpus: Corpus | null }) {
  const items = useMemo(() => (corpus ? corpus.entries.filter((e) => e.kind === 'notes').sort(byRecent).slice(0, 6) : []), [corpus]);
  const w = worldByKey.notes;
  return (
    <section className="home-sec" data-hue={w.hue}>
      <SecHead latin={`${w.latin} · ${w.body}`} title="冷光下的笔记" to={w.path} lead={w.motto} />
      <ol className="note-ledger" role="list">
        {!corpus && <SkeletonRows n={4} />}
        {items.map((e, i) => (
          <li key={e.id}>
            <Link to={e.to} className="note-ledger__row">
              <span className="note-ledger__n mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="note-ledger__title">{e.title}</span>
              <span className="note-ledger__cat">{e.category}</span>
              <span className="note-ledger__date readout">{e.date?.slice(0, 10)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- 书影音：气态巨星 ---------------- */
export function ShelfStrip({ corpus }: { corpus: Corpus | null }) {
  const items = useMemo(() => (corpus ? corpus.entries.filter((e) => e.kind === 'shelf').sort(byRecent).slice(0, 6) : []), [corpus]);
  const w = worldByKey.shelf;
  return (
    <section className="home-sec" data-hue={w.hue}>
      <SecHead latin={`${w.latin} · ${w.body}`} title="借来的星光" to={w.path} lead={w.motto} />
      <div className="shelf-strip">
        {!corpus && <SkeletonRows n={3} />}
        {items.map((e, i) => (
          <Link key={e.id} to={e.to} className="shelf-chip" data-kind={e.shelfKind} style={{ ['--i' as string]: i } as CSSProperties}>
            <span className="shelf-chip__kind latin">{e.category}</span>
            <span className="shelf-chip__title display">{e.title}</span>
            <span className="shelf-chip__by">{e.summary}</span>
            {e.rating != null && <Stars value={e.rating} size={11} />}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 留言：彗星 ---------------- */
export function CometTicker({ messages, failed, onRetry }: { messages: GuestMessage[] | null; failed?: boolean; onRetry?: () => void }) {
  const w = worldByKey.guestbook;
  const list = messages ?? [];
  return (
    <section className="home-sec" data-hue={w.hue}>
      <SecHead latin={`${w.latin} · ${w.body}`} title="掠过的彗星" to={w.path} lead={w.motto} />
      {failed && <ErrorState onRetry={onRetry} />}
      {!failed && list.length > 0 && (
        <div className="comet-ticker" aria-label="最近的留言">
          <div className="comet-ticker__track" style={{ ['--n' as string]: list.length } as CSSProperties}>
            {[...list, ...list].map((m, i) => (
              <figure key={`${m.id}-${i}`} className="comet-ticker__item" aria-hidden={i >= list.length || undefined}>
                <Sigil sigil={m.sigil} size={22} />
                <blockquote>{m.body}</blockquote>
                <figcaption>— {m.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      <Link to="/guestbook" className="knob home-sec__cta">
        <span className="knob__cap">留下你的尾迹</span>
      </Link>
    </section>
  );
}

/* ---------------- 刻度：数字 ---------------- */
function Meter({ label, value, active, hue, format, unknown }: { label: string; value: number; active: boolean; hue: string; format?: (n: number) => string; unknown?: boolean }) {
  const n = useCountUp(value, active);
  return (
    <div className="meter" data-hue={hue}>
      {/* unknown：数据还没读到（或读取失败），显示「—」而不是一个会让人误会的 0 */}
      <span className="meter__value mono">{unknown ? '—' : format ? format(n) : n}</span>
      <span className="meter__label">{label}</span>
    </div>
  );
}

export function Scale({ corpus, guests }: { corpus: Corpus | null; guests?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const active = seen && !!corpus;
  return (
    <section className="scale" ref={ref} aria-label="星系规模">
      <Meter label="篇随笔" value={corpus?.counts.essays ?? 0} active={active} hue="ember" />
      <Meter label="条笔记" value={corpus?.counts.notes ?? 0} active={active} hue="glacier" />
      <Meter label="份书影音" value={corpus?.counts.shelf ?? 0} active={active} hue="nebula" />
      <Meter label="档案" value={corpus?.totalBytes ?? 0} active={active} hue="sol" format={(n) => formatBytes(n)} />
      <Meter label="颗彗星" value={guests ?? 0} active={active} hue="aurora" unknown={guests === undefined} />
      <Meter label="个标签" value={corpus?.tags.length ?? 0} active={active} hue="rose" />
    </section>
  );
}
