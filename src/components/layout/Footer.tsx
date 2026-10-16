import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_TAGLINE, navItems } from '../../config/site';
import { closing } from '../../config/axioms';
import { useAuth } from '../../auth/AuthContext';
import { AxiomMark } from './AxiomMark';
import { IconKey } from '../ui/Icons';

export function Footer() {
  const { hinted } = useAuth();
  return (
    <footer className="footer">
      <hr className="horizon" />
      <div className="footer__inner">
        <div className="footer__brand">
          <AxiomMark className="footer__mark" />
          <div>
            <p className="footer__name display">{SITE_NAME}</p>
            <p className="footer__tag">{SITE_TAGLINE}</p>
          </div>
        </div>
        <nav className="footer__nav" aria-label="页脚导航">
          {navItems.map((n) => (
            <Link key={n.to} to={n.to}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="footer__end">
          <p className="footer__closing display">{closing}</p>
          <Link to={hinted ? '/console' : '/owner'} className="footer__owner" aria-label={hinted ? '进入控制台' : '站长入口'}>
            <IconKey size={15} />
            <span>{hinted ? '控制台' : '站长入口'}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
