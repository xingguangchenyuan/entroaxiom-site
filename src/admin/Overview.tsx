import { useMemo } from 'react';
import { content, files } from '../lib/adminApi';
import { useAsync } from '../hooks/useAsync';
import { formatBytes } from '../lib/format';
import { Knob } from '../components/ui/Knob';
import { ErrorState } from '../components/state/ErrorState';
import { isLive } from './status';

export type Tab = 'overview' | 'notes' | 'summaries' | 'files';

/** 概览：三类内容的总数 / 对访客可见数，以及最近动过的几项 */
export function Overview({ go }: { go: (tab: Tab, edit?: string, create?: boolean) => void }) {
  const state = useAsync(async () => {
    const [notes, summaries, fl] = await Promise.all([content.list('notes'), content.list('summaries'), files.list()]);
    return { notes, summaries, fl };
  }, []);

  const data = state.status === 'ready' ? state.data : null;
  const recent = useMemo(() => {
    if (!data) return [];
    return [
      ...data.notes.map((n) => ({ tab: 'notes' as Tab, id: n.id, title: n.title, at: n.updated_at, live: isLive(n.visibility, n.status), kind: '笔记' })),
      ...data.summaries.map((n) => ({ tab: 'summaries' as Tab, id: n.id, title: n.title, at: n.updated_at, live: isLive(n.visibility, n.status), kind: '总结' })),
      ...data.fl.map((n) => ({ tab: 'files' as Tab, id: n.id, title: n.name, at: n.updated_at, live: isLive(n.visibility, n.status), kind: '文件' })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [data]);

  if (state.status === 'error') return <ErrorState onRetry={state.retry} message={state.error instanceof Error ? state.error.message : undefined} />;

  const card = (label: string, total: number | null, live: number | null, extra?: string) => (
    <div className="readout">
      <p className="readout__v">{total ?? '—'}<span className="readout__unit">{live === null ? '' : `其中 ${live} 项访客可见`}</span></p>
      <p className="readout__k">{label}{extra ? ` · ${extra}` : ''}</p>
    </div>
  );

  return (
    <section aria-label="概览">
      <div className="scale">
        {card('学习笔记', data?.notes.length ?? null, data ? data.notes.filter((n) => isLive(n.visibility, n.status)).length : null)}
        {card('文章总结', data?.summaries.length ?? null, data ? data.summaries.filter((n) => isLive(n.visibility, n.status)).length : null)}
        {card('文件', data?.fl.length ?? null, data ? data.fl.filter((n) => isLive(n.visibility, n.status)).length : null, data ? formatBytes(data.fl.reduce((s, f) => s + f.size, 0)) : undefined)}
      </div>
      <div className="quick">
        <Knob onClick={() => go('notes', undefined, true)}>写一篇笔记</Knob>
        <Knob tone="dark" onClick={() => go('summaries', undefined, true)}>写一篇总结</Knob>
        <Knob tone="dark" onClick={() => go('files')}>上传文件</Knob>
      </div>
      {recent.length > 0 && (
        <>
          <h2 className="console__h">最近改动</h2>
          <div className="list-panel glass glass--flat">
            <ul className="list admin-list">
              {recent.map((r) => (
                <li key={`${r.tab}:${r.id}`} className="arow">
                  <div className="arow__main">
                    <button type="button" className="arow__title" onClick={() => go(r.tab, r.tab === 'files' ? undefined : r.id)}>{r.title}</button>
                    <p className="arow__meta"><span className="tag">{r.kind}</span><span className={`tag ${r.live ? 'tag--moss' : ''}`}><span className={`led ${r.live ? 'led--on' : ''}`} /> {r.live ? '访客可见' : '仅自己'}</span><time>{r.at.slice(0, 16).replace('T', ' ')}</time></p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
