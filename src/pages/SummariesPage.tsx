import { moduleTitles } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { ModuleList } from '../components/list/ModuleList';

export function SummariesPage() {
  useDocumentTitle(moduleTitles.summaries);
  return (
    <ContentPanel>
      <ModuleList kind="summaries" />
    </ContentPanel>
  );
}