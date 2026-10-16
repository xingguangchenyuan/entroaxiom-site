import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotFoundState } from '../components/state/NotFoundState';

export function NotFoundPage() {
  useDocumentTitle('页面不存在');
  return (
    <main id="main" className="page" tabIndex={-1}>
      <NotFoundState />
    </main>
  );
}
