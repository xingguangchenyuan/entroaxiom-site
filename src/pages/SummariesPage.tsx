import { moduleTitles } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ModuleList } from '../components/list/ModuleList';

export function SummariesPage() {
  useDocumentTitle(moduleTitles.summaries);
  return <ModuleList kind="summaries" />;
}
