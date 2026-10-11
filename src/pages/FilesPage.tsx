import { useEffect, useMemo, useState } from 'react';
import { listFiles } from '../content/loader';
import type { FileItem } from '../content/types';
import { moduleTitles, copy } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useListQuery } from '../hooks/useListQuery';
import { ContentPanel } from '../components/layout/ContentPanel';
import { SearchBox } from '../components/list/SearchBox';
import { FileRow } from '../components/list/FileRow';
import { DemoBadge } from '../components/list/DemoBadge';
import { EmptyState } from '../components/state/EmptyState';
import { NoResults } from '../components/state/NoResults';
import { ErrorState } from '../components/state/ErrorState';
import { kindLabel } from '../lib/format';

function matches(file: FileItem, q: string): boolean {
  const text = [file.name, file.ext, kindLabel(file.kind)].join(' ').toLowerCase();
  return q === '' || text.includes(q);
}

export function FilesPage() {
  useDocumentTitle(moduleTitles.files);
  const { query, setQuery, clear } = useListQuery();
  const [files, setFiles] = useState<FileItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch(() => setError(true));
  }, []);

  const q = query.toLowerCase();
  const filtered = useMemo(() => (files ? files.filter((f) => matches(f, q)) : []), [files, q]);

  if (error) return <ErrorState />;
  if (files === null) {
    return (
      <ContentPanel>
        <div className="state-loading" role="status">
          <span className="state-loading-bar" />
        </div>
      </ContentPanel>
    );
  }

  return (
    <ContentPanel>
      <div className="module-header">
        <h1 className="module-title">{moduleTitles.files}</h1>
        <DemoBadge />
        <div className="module-header-right">
          <SearchBox
            label={copy.placeholder.files}
            placeholder={copy.placeholder.files}
            currentQuery={query}
            onSubmit={setQuery}
          />
        </div>
      </div>

      {filtered.length === 0 && files.length > 0 ? (
        <NoResults onClear={clear} />
      ) : filtered.length === 0 ? (
        <EmptyState message={copy.empty.files} />
      ) : (
        <ul className="file-list">
          {filtered.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </ul>
      )}
    </ContentPanel>
  );
}