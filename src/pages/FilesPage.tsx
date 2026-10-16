import { useMemo } from 'react';
import { listFiles } from '../content/loader';
import type { FileItem } from '../content/types';
import { moduleTitles, copy } from '../config/site';
import { worldByKey } from '../config/worlds';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ALL, useListQuery, type SortKey } from '../hooks/useListQuery';
import { useAsync } from '../hooks/useAsync';
import { formatBytes, kindLabel } from '../lib/format';
import { SearchBox } from '../components/list/SearchBox';
import { FileRow } from '../components/list/FileRow';
import { CategoryFilter } from '../components/list/CategoryFilter';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { NoResults } from '../components/state/NoResults';
import { ErrorState } from '../components/state/ErrorState';

function matches(file: FileItem, q: string, cat: string): boolean {
  const text = [file.name, file.ext, kindLabel(file.kind), file.description ?? ''].join(' ').toLowerCase();
  return (q === '' || text.includes(q)) && (cat === ALL || kindLabel(file.kind) === cat);
}

export function FilesPage() {
  useDocumentTitle(moduleTitles.files);
  const world = worldByKey.files;
  const { query, category, sort, setQuery, setCategory, setSort, clear } = useListQuery();
  const state = useAsync(() => listFiles(), []);
  const files = state.status === 'ready' ? state.data : null;

  const kinds = useMemo(() => {
    const c: Record<string, number> = { [ALL]: files?.length ?? 0 };
    files?.forEach((f) => (c[kindLabel(f.kind)] = (c[kindLabel(f.kind)] ?? 0) + 1));
    return c;
  }, [files]);

  const q = query.toLowerCase();
  const filtered = useMemo(() => {
    if (!files) return [];
    const out = files.filter((f) => matches(f, q, category));
    if (sort === 'title') out.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    else out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return out;
  }, [files, q, category, sort]);

  const total = files ? files.reduce((s, f) => s + f.size, 0) : 0;

  if (state.status === 'error') {
    return (
      <main id="main" className="page" tabIndex={-1}>
        <ModuleHeader title={moduleTitles.files} lead={world.motto} />
        <ErrorState onRetry={state.retry} />
      </main>
    );
  }

  return (
    <main id="main" className="page" tabIndex={-1}>
      <ModuleHeader title={moduleTitles.files} lead={`${world.motto}。${world.description}`} total={files?.length} unit="个文件">
        {files && files.length > 0 && <span className="tag">{`合计 ${formatBytes(total)}`}</span>}
      </ModuleHeader>
      {files === null ? (
        <div className="list-skeleton" aria-busy="true" aria-label="正在加载">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--card" />)}
        </div>
      ) : files.length === 0 ? (
        <EmptyState message={copy.empty.files} hint="有文件公开后，会出现在这里。" />
      ) : (
        <>
          <div className="toolbar">
            <SearchBox label={copy.placeholder.files} placeholder={copy.placeholder.files} currentQuery={query} onSubmit={setQuery} />
            <Segmented<SortKey> label="排序方式" value={sort} onChange={setSort} options={[{ value: 'recent', label: '最近更新' }, { value: 'title', label: '文件名' }]} />
          </div>
          {Object.keys(kinds).length > 2 && <CategoryFilter categories={Object.keys(kinds)} counts={kinds} active={category} onSelect={setCategory} label="按类型筛选" />}
          {filtered.length === 0 ? (
            <NoResults onClear={clear} />
          ) : (
            <div className="list-panel glass glass--flat">
              <ul className="list" aria-label={`文件列表，共 ${filtered.length} 项`}>
                {filtered.map((f) => <FileRow key={f.id} file={f} />)}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
