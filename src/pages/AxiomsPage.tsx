import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { axioms, closing, horizon, preface, type Axiom } from '../config/axioms';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Knob } from '../components/ui/Knob';
import { IconArrow } from '../components/ui/Icons';

/** 牌面符号：纯 SVG 线描 */
function Glyph({ g }: { g: Axiom['glyph'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 100 100" className="tarot__glyph" aria-hidden="true">
      <g {...common}>
        {g === 'eye' && (
          <>
            <path d="M14 50 Q50 18 86 50 Q50 82 14 50Z" />
            <circle cx="50" cy="50" r="12" />
            <circle cx="50" cy="50" r="4" fill="currentColor" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={50 + (i - 3) * 9} y1="14" x2={50 + (i - 3) * 12} y2="4" />)}
          </>
        )}
        {g === 'hourglass' && (
          <>
            <path d="M30 12 H70 M30 88 H70 M34 12 C34 40 50 42 50 50 C50 58 34 60 34 88 M66 12 C66 40 50 42 50 50 C50 58 66 60 66 88" />
            <path d="M42 80 Q50 70 58 80Z" fill="currentColor" />
            <circle cx="50" cy="56" r="1.4" fill="currentColor" />
          </>
        )}
        {g === 'spiral' && <path d="M50 50 m0 -3 a3 3 0 1 1 -3 3 a7 7 0 1 1 7 7 a12 12 0 1 1 -12 -12 a18 18 0 1 1 18 18 a25 25 0 1 1 -25 -25 a33 33 0 1 1 33 33" />}
        {g === 'ouroboros' && (
          <>
            <circle cx="50" cy="50" r="30" />
            <circle cx="50" cy="50" r="24" strokeDasharray="2 4" />
            <path d="M74 32 l8 -4 l-2 9 Z" fill="currentColor" />
            <circle cx="50" cy="50" r="5" />
          </>
        )}
        {g === 'horizon' && (
          <>
            <ellipse cx="50" cy="50" rx="40" ry="10" />
            <circle cx="50" cy="50" r="15" fill="currentColor" fillOpacity="0.15" />
            <circle cx="50" cy="50" r="19" strokeDasharray="1 3" />
            <path d="M10 50 Q50 20 90 50" opacity="0.5" />
          </>
        )}
        {g === 'key' && (
          <>
            <circle cx="50" cy="26" r="12" />
            <circle cx="50" cy="26" r="4" />
            <path d="M50 38 V86 M50 64 H60 M50 74 H64 M50 84 H58" />
          </>
        )}
        {g === 'star' && (
          <>
            <path d="M50 14 L56 44 L86 50 L56 56 L50 86 L44 56 L14 50 L44 44 Z" />
            <path d="M58 42 L84 18" strokeDasharray="2 3" />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
}

function Tarot({ a, i }: { a: Axiom; i: number }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <li className="tarot-slot" style={{ ['--i' as string]: i, ['--c' as string]: a.color } as CSSProperties}>
      <div className={`tarot${flipped ? ' is-flipped' : ''}`}>
        <button type="button" className="tarot__face tarot__front" onClick={() => setFlipped(true)} aria-label={`第 ${a.numeral} 张牌：${a.arcana}，点击翻开`} aria-hidden={flipped} tabIndex={flipped ? -1 : 0}>
          <span className="tarot__num latin">{a.numeral}</span>
          <Glyph g={a.glyph} />
          <span className="tarot__arcana latin">{a.arcana}</span>
        </button>
        <div className="tarot__face tarot__back" aria-hidden={!flipped}>
          <span className="tarot__num latin">{a.numeral}</span>
          <h2 className="tarot__title display">{a.title}</h2>
          <p className="tarot__body">{a.body}</p>
          <p className="tarot__gloss">「{a.gloss}」</p>
          <div className="tarot__foot">
            {a.to && (
              <Link to={a.to} className="text-action" tabIndex={flipped ? 0 : -1}>
                {a.toLabel} <IconArrow size={13} />
              </Link>
            )}
            <button type="button" className="text-action tarot__reflip" onClick={() => setFlipped(false)} tabIndex={flipped ? 0 : -1}>
              合上
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** 公理：七张牌。文字来自 config/axioms.ts，站长可直接改 */
export function AxiomsPage() {
  useDocumentTitle('公理');
  const c = useCorpus();
  const total = c.status === 'ready' ? c.corpus.entries.length : null;
  return (
    <main id="main" className="page page--wide axioms" tabIndex={-1} data-hue="sol">
      <header className="axioms__head">
        <p className="latin">Axiomata · entropy + axiom</p>
        <h1 className="display axioms__title">{preface.title}</h1>
        {preface.paragraphs.map((p) => (
          <p key={p} className="axioms__p">{p}</p>
        ))}
      </header>

      <p className="tarot-hint only-mob" aria-hidden="true">左右滑动 · 七张牌依次展开</p>
      <ol className="tarot-spread" role="list">
        {axioms.map((a, i) => (
          <Tarot key={a.numeral} a={a} i={i} />
        ))}
      </ol>

      <hr className="horizon" />

      <section className="axioms__eighth" aria-labelledby="hz-h">
        <div className="axioms__eighth-card" aria-hidden="true">
          <span className="latin">VIII</span>
          <span className="axioms__eighth-q display">?</span>
        </div>
        <div>
          <h2 id="hz-h" className="display">{horizon.title}</h2>
          <p>{horizon.text}</p>
          {total !== null && <p className="readout">视界之内，现在有 {total} 项公开内容。</p>}
        </div>
      </section>

      <p className="axioms__closing display">{closing}</p>
      <div className="axioms__cta">
        <Knob to="/atlas">走进星图</Knob>
        <Knob to="/" tone="dark">回到星仪</Knob>
      </div>
    </main>
  );
}
