import { copy } from '../../config/site';
import { Knob } from '../ui/Knob';

/** 404：视界之外 */
export function NotFoundState({ title = copy.notFound.title, desc = copy.notFound.desc }: { title?: string; desc?: string }) {
  return (
    <div className="state-empty state-notfound" role="status">
      <svg className="state-icon state-icon--lg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="9" fill="#000" stroke="currentColor" strokeWidth="1.4" />
        <ellipse cx="24" cy="24" rx="21" ry="7.5" transform="rotate(-22 24 24)" stroke="var(--axiom)" strokeWidth="1.4" />
      </svg>
      <p className="state-title">{title}</p>
      <p className="state-text">{desc}</p>
      <div className="state-actions">
        <Knob to="/" tone="dark" size="sm">{copy.notFound.backHome}</Knob>
      </div>
    </div>
  );
}
