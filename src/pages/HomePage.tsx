import { useDrift } from '../hooks/useDrift';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePalette } from '../components/layout/CommandPalette';
import { Knob } from '../components/ui/Knob';
import { AtlasTeaser, AxiomStrip, Orbits, Scale, Trajectories } from '../components/home/HomeSections';
import { DemoBadge } from '../components/list/DemoBadge';

export function HomePage() {
  useDocumentTitle();
  const drift = useDrift();
  const palette = usePalette();
  const c = useCorpus();
  const corpus = c.status === 'ready' ? c.corpus : null;

  return (
    <main id="main" className="home" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-h">
        <div className="hero__copy">
          <h1 id="hero-h" className="hero__title display">
            <span className="hero__line">在无序的熵变中，</span>
            <span className="hero__line">确立世界的公理。</span>
          </h1>
          <p className="hero__lead">
            这里放着我的学习笔记、文章总结和文件。读到的、想到的、试出来的，一点一点整理成自己的公理。
          </p>
          <div className="hero__actions">
            <Knob to="/atlas" size="lg">走进星图</Knob>
            <Knob tone="dark" size="lg" onClick={drift}>随机漂流</Knob>
            <button type="button" className="text-action hero__search" onClick={palette.open}>
              搜索全站，按 <kbd>/</kbd>
            </button>
          </div>
          <DemoBadge />
        </div>
        <div className="hero__cue" aria-hidden="true"><span /></div>
      </section>

      <div className="home-body">
        <Orbits corpus={corpus} />
        <AxiomStrip />
        <Trajectories corpus={corpus} state={c.status} onRetry={c.retry} />
        <AtlasTeaser corpus={corpus} />
        <Scale corpus={corpus} />
      </div>
    </main>
  );
}
