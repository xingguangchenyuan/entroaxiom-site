import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { content, type AdminContentItem, type ContentModule } from '../lib/adminApi';
import { useAsync } from '../hooks/useAsync';
import { SearchBox } from '../components/list/SearchBox';
import { Knob } from '../components/ui/Knob';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { IconEdit, IconEye, IconEyeOff, IconPlus, IconTrash } from '../components/ui/Icons';
import { ConfirmDialog } from './ConfirmDialog';
import { StateBadge, isLive } from './status';
import { useToast } from './Toast';

type Filter = 'all' | 'live' | 'hidden';
const LABEL: Record<ContentModule, string> = { notes: '笔记', summaries: '总结' };

export function ContentManager({ module, onEdit, onCreate }: { module: ContentModule; onEdit: (id: string) => void; onCreate: () => void }) {
  const toast = useToast();
  const state = useAsync(() => content.list(module), [module]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [del, setDel] = useState<AdminContentItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = state.status === 'ready' ? state.data : null;
  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (filter === 'all' ? true : filter === 'live' ? isLive(r.visibility, r.status) : !isLive(r.visibility, r.status)))
      .filter((r) => !needle || [r.title, r.id, r.summary, r.category ?? '', ...r.tags].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [rows, q, filter]);

  /** 一键公开 / 收回：公开 = public + published；收回 = private（保留发布状态，不丢草稿信息） */
  const toggleLive = async (r: AdminContentItem) => {
    setBusyId(r.id);
    try {
      const live = isLive(r.visibility, r.status);
      await content.update(module, r.id, live ? { visibility: 'private' } : { visibility: 'public', status: 'published' });
      toast.push(live ? `已收回「${r.title}」，访客看不到了` : `已公开「${r.title}」`);
      state.retry();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await content.remove(module, del.id);
      toast.push(`已删除「${del.title}」`);
      setDel(null);
      state.retry();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : '删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (state.status === 'error') return <ErrorState onRetry={state.retry} message={state.error instanceof Error ? state.error.message : undefined} />;

  return (
    <section aria-label={`${LABEL[module]}管理`}>
      <div className="toolbar">
        <SearchBox label={`搜索${LABEL[module]}`} placeholder={`搜索${LABEL[module]}（标题、标签、分类）`} currentQuery={q} onSubmit={setQ} />
        <div className="toolbar__right">
          <Segmented<Filter> label="按可见性筛选" value={filter} onChange={setFilter} options={[{ value: 'all', label: '全部' }, { value: 'live', label: '访客可见' }, { value: 'hidden', label: '仅自己' }]} />
          <Knob size="sm" onClick={onCreate}><IconPlus size={15} /> 新建{LABEL[module]}</Knob>
        </div>
      </div>

      {rows === null ? (
        <div className="list-skeleton" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton--row" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState message={`还没有${LABEL[module]}`} hint="点击右上角的“新建”写下第一篇。新建的内容默认私密，公开前访客看不到。" />
      ) : shown.length === 0 ? (
        <EmptyState message="没有匹配的内容" />
      ) : (
        <div className="list-panel glass glass--flat">
          <ul className="list admin-list">
            {shown.map((r) => {
              const live = isLive(r.visibility, r.status);
              return (
                <li key={r.id} className="arow">
                  <div className="arow__main">
                    <button type="button" className="arow__title" onClick={() => onEdit(r.id)}>{r.title}</button>
                    <p className="arow__meta">
                      <StateBadge visibility={r.visibility} status={r.status} />
                      {r.category && <span className="tag tag--gold">{r.category}</span>}
                      <span className="arow__id">{r.id}</span>
                      <time>{r.updated ?? r.date ?? r.updated_at.slice(0, 10)}</time>
                    </p>
                  </div>
                  <div className="arow__actions">
                    {live && <Link className="text-action" to={`/${module}/${r.id}`}>查看</Link>}
                    <button type="button" className="icon-btn" aria-label={live ? `收回「${r.title}」` : `公开「${r.title}」`} title={live ? '收回（仅自己可见）' : '公开（访客可见）'} disabled={busyId === r.id} onClick={() => toggleLive(r)}>
                      {live ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                    </button>
                    <button type="button" className="icon-btn" aria-label={`编辑「${r.title}」`} title="编辑" onClick={() => onEdit(r.id)}><IconEdit size={17} /></button>
                    <button type="button" className="icon-btn icon-btn--danger" aria-label={`删除「${r.title}」`} title="删除" onClick={() => setDel(r)}><IconTrash size={17} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {del && (
        <ConfirmDialog title="删除这篇内容？" confirmLabel="删除" danger busy={deleting} onConfirm={doDelete} onCancel={() => setDel(null)}>
          <p>「{del.title}」将被永久删除，无法恢复。{isLive(del.visibility, del.status) && '它现在对访客可见，删除后链接会变成“内容不存在”。'}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
