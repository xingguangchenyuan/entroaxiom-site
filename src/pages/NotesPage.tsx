import { moduleTitles } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ModuleList } from '../components/list/ModuleList';

export function NotesPage() {
  useDocumentTitle(moduleTitles.notes);
  return <ModuleList kind="notes" />;
}
