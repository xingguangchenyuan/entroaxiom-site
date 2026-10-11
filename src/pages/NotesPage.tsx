import { moduleTitles } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { ModuleList } from '../components/list/ModuleList';

export function NotesPage() {
  useDocumentTitle(moduleTitles.notes);
  return (
    <ContentPanel>
      <ModuleList kind="notes" />
    </ContentPanel>
  );
}