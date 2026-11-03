import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_TAGLINE } from '../../config/site';
import { closing } from '../../config/axioms';
import { worlds } from '../../config/worlds';
import { AxiomMark } from './AxiomMark';
import { useMoonPhase } from '../../hooks/useMoonPhase';

/**
 * 页脚：一块“星历”。左边是站名与箴言，中间是五颗天体的索引，
 * 右边是今晚的月相与本地时间——一个小小的、与真实天空同步的仪式。
 */
export function Footer() {
  const moon = useMoonPhase();
  return (
    <footer className="footer">
      <hr className="horizon" />
      <div className="footer__inner">
        <div className="footer__brand">
          <AxiomMark className="footer__mark" />
          <div>
            <p className="footer__name">{SITE_NAME}</p>
            <p className="footer__tag">{SITE_TAGLINE}</p>
          </div>
        </div>
        <nav className="footer__nav" aria-label="页脚导航">
          {worlds.map((w) => (
            <Link key={w.key} to={w.path} data-hue={w.hue}>
              <span className="led" aria-hidden="true" />
              {w.module}
              <span className="latin">{w.latin}</span>
            </Link>
          ))}
          <Link to="/atlas">星图<span className="latin">Atlas</span></Link>
          <Link to="/axioms">公理<span className="latin">Axioms</span></Link>
        </nav>
        <div className="footer__end">
          <div className="footer__moon" title={`月龄 ${moon.age.toFixed(1)} 天`}>
            <svg viewBox="0 0 40 40" className="footer__moon-svg" aria-hidden="true">
              <defs>
                <clipPath id="moon-clip"><circle cx="20" cy="20" r="14" /></clipPath>
              </defs>
              <circle cx="20" cy="20" r="14" fill="#1b1f33" />
              <g clipPath="url(#moon-clip)">
                <path d={moon.path} fill="var(--sol-hi)" />
              </g>
              <circle cx="20" cy="20" r="14" fill="none" stroke="var(--line-3)" />
            </svg>
            <div>
              <p className="footer__moon-name">今夜 · {moon.name}</p>
              <p className="readout">{moon.illumination}% 被照亮</p>
            </div>
          </div>
          <p className="footer__closing display">{closing}</p>
          <p className="readout">© {new Date().getFullYear()} {SITE_NAME} · 用星光写成</p>
        </div>
      </div>
    </footer>
  );
}
