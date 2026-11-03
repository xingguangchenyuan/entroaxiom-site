import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { listFiles, peekFiles } from '../content/loader';
import type { FileItem } from '../content/types';
import { copy } from '../config/site';
import { worldByKey } from '../config/worlds';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ALL, useListQuery, type SortKey } from '../hooks/useListQuery';
import { useAsync } from '../hooks/useAsync';
import { formatBytes, kindLabel } from '../lib/format';
import { SearchBox } from '../components/list/SearchBox';
import { CategoryFilter } from '../components/list/CategoryFilter';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { DemoBadge } from '../components/list/DemoBadge';
import { FileGlyph, KIND_COLOR } from '../components/files/FileGlyph';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { NoResults } from '../components/state/NoResults';
import { ErrorState } from '../components/state/ErrorState';

function matches(file: FileItem, q: string, cat: string): boolean {
  const text = [file.name, file.ext, kindLabel(file.kind), file.description ?? ''].join(' ').toLowerCase();
  return (q === '' || text.includes(q)) && (cat === ALL || kindLabel(file.kind) === cat);
}

/**
 * 文件库：陨石带。
 * 顶部是一条按体积比例分段的“质量光谱”（各类型占比），
 * 下面每个文件是一块陨石：形状、颜色随类型变化，右侧显示体积的对数刻度条。
 */
export function FilesPage() {
  const world = worldByKey.files;
  useDocumentTitle(world.module);
  const { query, category, sort, setQuery, setCategory, setSort, clear } = useListQuery();
  const state = useAsync(() => listFiles(), [], peekFiles);
  const files = state.status === 'ready' ? state.data : null;

  const { kinds, counts, bytesByKind } = useMemo(() => {
    const counts: Record<string, number> = {};
    const bytesByKind: Partial<Record<FileItem['kind'], number>> = {};
    files?.forEach((f) => {
      counts[kindLabel(f.kind)] = (counts[kindLabel(f.kind)] ?? 0) + 1;
      bytesByKind[f.kind] = (bytesByKind[f.kind] ?? 0) + f.size;
    });
    return { kinds: Object.keys(counts), counts, bytesByKind };
  }, [files]);

  const q = query.toLowerCase();
  const filtered = useMemo(() => {
    if (!files) return [];
    const out = files.filter((f) => matches(f, q, category));
    if (sort === 'title') out.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    else if (sort === 'size') out.sort((a, b) => b.size - a.size);
    else out.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return out;
  }, [files, q, category, sort]);

  const total = files ? files.reduce((s, f) => s + f.size, 0) : 0;
  const maxLog = files && files.length ? Math.max(...files.map((f) => Math.log10(f.size + 1))) : 1;
  const kindKeys = Object.keys(bytesByKind) as FileItem['kind'][];

  return (
    <main id="main" className="page" tabIndex={-1} data-hue={world.hue}>
      <ModuleHeader world={world} total={files?.length} unit="个文件">
        <DemoBadge />
      </ModuleHeader>

      {state.status === 'error' && <ErrorState onRetry={state.retry} />}
      {files === null && state.status !== 'error' && (
        <div className="skeleton" aria-busy="true"><div className="skeleton__row" /><div className="skeleton__row" /></div>
      )}
      {files && files.length === 0 && <EmptyState message={copy.empty.files} hint="有文件公开后，会出现在这里。" />}

      {files && files.length > 0 && (
        <>
          <section className="belt-spectrum" aria-label={`总质量 ${formatBytes(total)}`}>
            <div className="belt-spectrum__bar">
              {kindKeys.map((k) => (
                <span
                  key={k}
                  style={{ flexGrow: Math.max(bytesByKind[k] ?? 0, total * 0.04), ['--c' as string]: KIND_COLOR[k] } as CSSProperties}
                  title={`${kindLabel(k)} ${formatBytes(bytesByKind[k] ?? 0)}`}
                />
              ))}
            </div>
            <div className="belt-spectrum__legend">
              {kindKeys.map((k) => (
                <span key={k} style={{ ['--c' as string]: KIND_COLOR[k] } as CSSProperties}>
                  <i aria-hidden="true" /> {kindLabel(k)} · {formatBytes(bytesByKind[k] ?? 0)}
                </span>
              ))}
              <span className="readout belt-spectrum__total">Σ {formatBytes(total)}</span>
            </div>
          </section>

          <div className="toolbar">
            <SearchBox label={copy.placeholder.files} placeholder={copy.placeholder.files} currentQuery={query} onSubmit={setQuery} />
            <Segmented<SortKey>
              label="排序方式"
              value={sort === 'rating' ? 'recent' : sort}
              onChange={setSort}
              options={[
                { value: 'recent', label: '最近' },
                { value: 'title', label: '名称' },
                { value: 'size', label: '质量' },
              ]}
            />
          </div>
          {kinds.length > 1 && <CategoryFilter categories={kinds} counts={counts} active={category} onSelect={setCategory} label="按类型筛选" />}

          {filtered.length === 0 ? (
            <NoResults onClear={clear} />
          ) : (
            <ul className="belt" role="list" aria-label={`文件列表，共 ${filtered.length} 项`}>
              {filtered.map((f, i) => (
                <li key={f.id} style={{ ['--i' as string]: i } as CSSProperties}>
                  <Link to={`/files/${encodeURIComponent(f.id)}`} className="belt__row lit">
                    <FileGlyph kind={f.kind} ext={f.ext} seed={i} />
                    <span className="belt__main">
                      <span className="belt__name">{f.name}</span>
                      {f.description && <span className="belt__desc">{f.description}</span>}
                    </span>
                    <span className="belt__mass" aria-label={`大小 ${formatBytes(f.size)}`}>
                      <span className="belt__gauge" style={{ ['--w' as string]: Math.log10(f.size + 1) / maxLog } as CSSProperties} />
                      <span className="readout">{formatBytes(f.size)}</span>
                    </span>
                    <span className="belt__date readout">{f.updatedAt?.slice(0, 10) ?? '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
