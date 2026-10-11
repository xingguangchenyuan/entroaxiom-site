import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { NotFoundState } from '../components/state/NotFoundState';

export function NotFoundPage() {
  useDocumentTitle('页面不存在');
  return (
    <ContentPanel>
      <NotFoundState />
    </ContentPanel>
  );
}