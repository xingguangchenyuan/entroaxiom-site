import { Link } from 'react-router-dom';
import { axioms, closing, horizon, preface } from '../config/axioms';
import { SITE_NAME } from '../config/site';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Knob } from '../components/ui/Knob';
import { IconArrow } from '../components/ui/Icons';

const NUM = ['一', '二', '三'];

/** 公理：这个站点为什么存在。文字全部来自 config/axioms.ts，站长可直接改 */
export function AxiomsPage() {
  useDocumentTitle('公理');
  const c = useCorpus();
  const total = c.status === 'ready' ? c.corpus.entries.length : null;
  return (
    <main id="main" className="page axioms" tabIndex={-1}>
      <header className="page__head">
        <h1 className="page__title display">{preface.title}</h1>
        <p className="page__lead">{SITE_NAME} = entropy + axiom</p>
      </header>

      <section className="axioms__preface" aria-label="序">
        {preface.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <hr className="horizon" />

      <section className="axioms__list" aria-label="三条公理">
        {axioms.map((a, i) => (
          <article key={a.title} className="ax glass glass--flat lit">
            <span className="ax__num display" aria-hidden="true">{NUM[i]}</span>
            <div className="ax__body">
              <h2 className="ax__title display">{a.title}</h2>
              <p>{a.body}</p>
              <Link to={a.to} className="text-action">
                {a.toLabel} <IconArrow size={14} />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="horizon-note glass lit" aria-labelledby="hz-h">
        <h2 id="hz-h" className="display">{horizon.title}</h2>
        <p>{horizon.text}</p>
        {total !== null && <p className="horizon-note__n">视界之内，现在有 {total} 项公开内容。</p>}
      </section>

      <p className="axioms__closing display">{closing}</p>
      <div className="axioms__cta">
        <Knob to="/atlas">走进星图</Knob>
        <Knob to="/" tone="dark">回到首页</Knob>
      </div>
    </main>
  );
}
