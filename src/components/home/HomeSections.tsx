import { Link } from 'react-router-dom';
import type { Corpus, Entry } from '../../content/corpus';
import { axioms, preface } from '../../config/axioms';
import { worldByKey, worlds } from '../../config/worlds';
import { formatBytes } from '../../lib/format';
import { useCountUp } from '../../hooks/useCountUp';
import { useInView } from '../../hooks/useInView';
import { ConstellationGraph } from '../atlas/ConstellationGraph';
import { Knob } from '../ui/Knob';
import { IconArrow } from '../ui/Icons';

/* ---------- 三条轨道：一块玻璃，三行入口 ---------- */
export function Orbits({ corpus }: { corpus: Corpus | null }) {
  return (
    <section className="home-sec" aria-labelledby="orbits-h">
      <div className="home-sec__head">
        <h2 id="orbits-h" className="home-sec__title display">三条轨道</h2>
        <p className="home-sec__lead">围绕同一个黑洞公转的三类内容。</p>
      </div>
      <div className="orbits glass lit">
        {worlds.map((w) => {
          const n = corpus?.counts[w.key];
          return (
            <Link key={w.key} to={w.path} className={`orbit orbit--${w.tone}`}>
              <span className="orbit__sigil" aria-hidden="true">
                <img src={w.symbol} alt="" width={96} height={96} loading="lazy" decoding="async" />
              </span>
              <span className="orbit__body">
                <span className="orbit__name display">{w.module}</span>
                <span className="orbit__motto">{w.motto}</span>
                <span className="orbit__desc">{w.description}</span>
              </span>
              <span className="orbit__side">
                <span className="orbit__count">{n === undefined ? '—' : n}</span>
                <span className="orbit__unit">{w.key === 'files' ? '个文件' : '篇'}</span>
                <IconArrow className="orbit__arrow" size={20} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 三条公理 ---------- */
const NUM = ['一', '二', '三'];
export function AxiomStrip() {
  return (
    <section className="home-sec home-sec--axioms" aria-labelledby="axioms-h">
      <div className="axioms-intro">
        <h2 id="axioms-h" className="home-sec__title display">三条公理</h2>
        <p className="axioms-intro__quote display">{preface.paragraphs[0]}</p>
      </div>
      <ol className="axioms-grid">
        {axioms.map((a, i) => (
          <li key={a.title} className="axiom">
            <span className="axiom__num display" aria-hidden="true">{NUM[i]}</span>
            <h3 className="axiom__title display">{a.title}</h3>
            <p className="axiom__body">{a.body}</p>
            <Link to={a.to} className="text-action">
              {a.toLabel}
              <IconArrow size={14} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 最近的轨迹 ---------- */
function Recent({ entries }: { entries: Entry[] }) {
  return (
    <ul className="recent">
      {entries.map((e) => (
        <li key={`${e.kind}:${e.id}`}>
          <Link to={e.to} className="recent__row">
            <span className="recent__date">{e.date ?? ''}</span>
            <span className={`tag tag--${worldByKey[e.kind].tone === 'frost' ? 'frost' : worldByKey[e.kind].tone === 'gold' ? 'gold' : 'moss'}`}>{worldByKey[e.kind].module}</span>
            <span className="recent__main">
              <span className="recent__title">{e.title}</span>
              {e.summary && <span className="recent__sum">{e.summary}</span>}
            </span>
            <IconArrow className="recent__arrow" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Trajectories({ corpus, state, onRetry }: { corpus: Corpus | null; state: 'loading' | 'error' | 'ready'; onRetry: () => void }) {
  const latest = corpus ? [...corpus.entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 6) : [];
  return (
    <section className="home-sec" aria-labelledby="recent-h">
      <div className="home-sec__head home-sec__head--split">
        <div>
          <h2 id="recent-h" className="home-sec__title display">最近的轨迹</h2>
          <p className="home-sec__lead">刚刚留下的几条痕迹。</p>
        </div>
        <Link to="/atlas?view=timeline" className="text-action">
          全部轨迹
          <IconArrow size={14} />
        </Link>
      </div>
      {state === 'loading' && (
        <div className="recent recent--skeleton" aria-busy="true" aria-label="正在加载">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton--row" />)}
        </div>
      )}
      {state === 'error' && (
        <div className="state-inline" role="alert">
          <p>内容加载失败</p>
          <button type="button" className="text-action" onClick={onRetry}>重试</button>
        </div>
      )}
      {state === 'ready' && latest.length === 0 && <p className="state-inline">这里还没有内容。第一条轨迹出现后，会显示在这里。</p>}
      {state === 'ready' && latest.length > 0 && <Recent entries={latest} />}
    </section>
  );
}

/* ---------- 星图预览 ---------- */
export function AtlasTeaser({ corpus }: { corpus: Corpus | null }) {
  if (!corpus || corpus.entries.length < 3) return null;
  return (
    <section className="home-sec" aria-labelledby="atlas-h">
      <div className="teaser glass lit">
        <div className="teaser__text">
          <h2 id="atlas-h" className="home-sec__title display">星图</h2>
          <p className="teaser__lead">每一篇内容是一颗星，同一个标签或分类把它们连成星座。顺着连线走，常常会碰到忘了自己写过的东西。</p>
          <Knob to="/atlas" size="md">展开星图</Knob>
        </div>
        <Link to="/atlas" className="teaser__map" aria-label="打开星图">
          <ConstellationGraph entries={corpus.entries} compact label="星图预览" />
        </Link>
      </div>
    </section>
  );
}

/* ---------- 宇宙的尺度 ---------- */
function Meter({ value, unit, label, active }: { value: number; unit: string; label: string; active: boolean }) {
  const v = useCountUp(value, active);
  return (
    <div className="readout">
      <p className="readout__v">
        {v}
        <span className="readout__unit">{unit}</span>
      </p>
      <p className="readout__k">{label}</p>
    </div>
  );
}
export function Scale({ corpus }: { corpus: Corpus | null }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  if (!corpus) return null;
  return (
    <section className="home-sec" aria-labelledby="scale-h">
      <div className="home-sec__head">
        <h2 id="scale-h" className="home-sec__title display">宇宙的尺度</h2>
        <p className="home-sec__lead">到目前为止，这里有多少东西被好好放置过。</p>
      </div>
      <div className="scale" ref={ref}>
        <Meter value={corpus.counts.notes} unit="篇" label="学习笔记" active={seen} />
        <Meter value={corpus.counts.summaries} unit="篇" label="文章总结" active={seen} />
        <Meter value={corpus.counts.files} unit="个" label={`文件，共 ${formatBytes(corpus.totalBytes) || '0 B'}`} active={seen} />
        <Meter value={corpus.tags.length} unit="个" label="标签" active={seen} />
      </div>
    </section>
  );
}
