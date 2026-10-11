import { Link } from 'react-router-dom';
import { copy } from '../../config/site';

/** 404 状态（设计文档 §10） */
export function NotFoundState() {
  return (
    <div className="state-empty state-notfound" role="status">
      <p className="state-title">{copy.notFound.title}</p>
      <p className="state-text">{copy.notFound.desc}</p>
      <Link className="state-action" to="/">
        {copy.notFound.backHome}
      </Link>
    </div>
  );
}