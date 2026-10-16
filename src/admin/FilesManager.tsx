import { useCallback, useMemo, useRef, useState } from 'react';
import { files, AdminApiError, type AdminFile, type Status, type Visibility } from '../lib/adminApi';
import { useAsync } from '../hooks/useAsync';
import { formatBytes, kindLabel } from '../lib/format';
import { SearchBox } from '../components/list/SearchBox';
import { FileGlyph } from '../components/list/FileRow';
import { Knob } from '../components/ui/Knob';
import { Segmented } from '../components/ui/Segmented';
import { Switch } from '../components/ui/Switch';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { IconClose, IconDownload, IconEdit, IconExternal, IconTrash, IconUpload } from '../components/ui/Icons';
import { ConfirmDialog } from './ConfirmDialog';
import { StateBadge, isLive } from './status';
import { useToast } from './Toast';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Job {
  key: number;
  name: string;
  size: number;
  ratio: number;
  state: 'uploading' | 'done' | 'error';
  error?: string;
  abort?: () => void;
}

/** 单个文件的编辑抽屉：改名、说明、可见性、日期、地址标识 */
function FileEditor({ file, onClose, onSaved }: { file: AdminFile; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref);
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(file.visibility);
  const [status, setStatus] = useState<Status>(file.status);
  const [date, setDate] = useState(file.date ?? '');
  const [id, setId] = useState(file.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr('文件名不能为空');
    setBusy(true);
    setErr(null);
    try {
      await files.update(file.id, { name: name.trim(), description: description.trim(), visibility, status, date: date || null, ...(id.trim() && id.trim() !== file.id ? { id: id.trim() } : {}) });
      toast.push('文件信息已保存');
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog dialog--side" onKeyDown={(e) => e.key === 'Escape' && !busy && onClose()}>
      <div className="dialog__scrim" onClick={() => !busy && onClose()} aria-hidden="true" />
      <form className="drawer glass" role="dialog" aria-modal="true" aria-labelledby="fe-t" ref={ref} onSubmit={submit}>
        <div className="drawer__head">
          <h2 id="fe-t" className="dialog__title display">编辑文件</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}><IconClose size={18} /></button>
        </div>
        {err && <p className="form-error" role="alert">{err}</p>}
        <label className="field"><span className="field__l">文件名 <em>含扩展名</em></span><span className="slot"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} /></span></label>
        <label className="field"><span className="field__l">说明</span><span className="slot slot--area"><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></span></label>
        <div className="field"><span className="field__l">谁能看到</span><Segmented<Visibility> label="可见性" value={visibility} onChange={setVisibility} options={[{ value: 'private', label: '仅自己' }, { value: 'public', label: '公开' }]} /></div>
        <div className="field"><span className="field__l">发布状态</span><Segmented<Status> label="发布状态" value={status} onChange={setStatus} options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }]} /></div>
        <p className={`editor__live${isLive(visibility, status) ? ' is-live' : ''}`}>
          <span className={`led ${isLive(visibility, status) ? 'led--on' : ''}`} />
          {isLive(visibility, status) ? '文件会被放进对外目录，访客可以预览和下载。' : '文件保存在私密目录，只有登录后能读取。'}
        </p>
        <label className="field"><span className="field__l">日期</span><span className="slot"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></span></label>
        <label className="field"><span className="field__l">地址标识 <em>修改会改变访问链接</em></span><span className="slot"><input value={id} onChange={(e) => setId(e.target.value)} maxLength={80} /></span></label>
        <div className="dialog__actions">
          <Knob tone="dark" size="sm" onClick={onClose} disabled={busy}>取消</Knob>
          <Knob size="sm" type="submit" busy={busy}>保存</Knob>
        </div>
      </form>
    </div>
  );
}

export function FilesManager() {
  const toast = useToast();
  const state = useAsync(() => files.list(), []);
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pubOnUpload, setPubOnUpload] = useState(false);
  const [drag, setDrag] = useState(false);
  const [edit, setEdit] = useState<AdminFile | null>(null);
  const [del, setDel] = useState<AdminFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const rows = state.status === 'ready' ? state.data : null;
  const shown = useMemo(() => {
    if (!rows) return [];
    const n = q.trim().toLowerCase();
    return rows.filter((f) => !n || [f.name, f.id, f.ext, f.description ?? ''].join(' ').toLowerCase().includes(n)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [rows, q]);

  const upload = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list);
      arr.forEach((file) => {
        const key = ++seq.current;
        const job: Job = { key, name: file.name, size: file.size, ratio: 0, state: 'uploading' };
        const { promise, abort } = files.upload(
          file,
          { visibility: pubOnUpload ? 'public' : 'private', status: 'published' },
          (ratio) => setJobs((j) => j.map((x) => (x.key === key ? { ...x, ratio } : x))),
        );
        job.abort = abort;
        setJobs((j) => [...j, job]);
        promise
          .then(() => {
            setJobs((j) => j.map((x) => (x.key === key ? { ...x, ratio: 1, state: 'done' } : x)));
            state.retry();
            window.setTimeout(() => setJobs((j) => j.filter((x) => x.key !== key)), 2400);
          })
          .catch((e: unknown) => {
            const msg = e instanceof AdminApiError ? e.message : '上传失败';
            if (!(e instanceof AdminApiError && e.code === 'ABORTED')) toast.push(`${file.name}：${msg}`, 'error');
            setJobs((j) => (e instanceof AdminApiError && e.code === 'ABORTED' ? j.filter((x) => x.key !== key) : j.map((x) => (x.key === key ? { ...x, state: 'error', error: msg } : x))));
          });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pubOnUpload, toast],
  );

  const quickToggle = async (f: AdminFile) => {
    try {
      const live = isLive(f.visibility, f.status);
      await files.update(f.id, live ? { visibility: 'private' } : { visibility: 'public', status: 'published' });
      toast.push(live ? `已收回「${f.name}」` : `已公开「${f.name}」`);
      state.retry();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await files.remove(del.id);
      toast.push(`已删除「${del.name}」`);
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
    <section aria-label="文件管理">
      <div
        className={`dropzone glass glass--flat${drag ? ' is-drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
      >
        <IconUpload size={26} className="dropzone__icon" />
        <div className="dropzone__text">
          <p className="dropzone__t">把文件拖到这里，或选择文件上传</p>
          <p className="dropzone__s">上传的文件默认私密，只有登录后能读取。打开下面的开关，则上传后直接公开。</p>
        </div>
        <div className="dropzone__ctl">
          <Switch checked={pubOnUpload} onChange={setPubOnUpload} label="上传后公开" />
          <Knob size="sm" onClick={() => inputRef.current?.click()}>选择文件</Knob>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ''; }} />
        </div>
      </div>

      {jobs.length > 0 && (
        <ul className="jobs" aria-label="上传进度">
          {jobs.map((j) => (
            <li key={j.key} className={`job job--${j.state}`}>
              <span className="job__name">{j.name}</span>
              <span className="job__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(j.ratio * 100)} aria-label={`${j.name} 上传进度`}><span style={{ transform: `scaleX(${j.ratio})` }} /></span>
              <span className="job__st">{j.state === 'uploading' ? `${Math.round(j.ratio * 100)}%` : j.state === 'done' ? '完成' : j.error}</span>
              {j.state === 'uploading' && <button type="button" className="text-action" onClick={() => j.abort?.()}>取消</button>}
              {j.state === 'error' && <button type="button" className="text-action" onClick={() => setJobs((l) => l.filter((x) => x.key !== j.key))}>知道了</button>}
            </li>
          ))}
        </ul>
      )}

      <div className="toolbar toolbar--mt">
        <SearchBox label="搜索文件" placeholder="搜索文件名、说明" currentQuery={q} onSubmit={setQ} />
      </div>

      {rows === null ? (
        <div className="list-skeleton" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton--row" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState message="文件库还是空的" hint="拖入文件即可上传。" />
      ) : shown.length === 0 ? (
        <EmptyState message="没有匹配的文件" />
      ) : (
        <div className="list-panel glass glass--flat">
          <ul className="list admin-list">
            {shown.map((f) => {
              const live = isLive(f.visibility, f.status);
              return (
                <li key={f.id} className="arow">
                  <FileGlyph kind={f.kind as never} ext={f.ext} />
                  <div className="arow__main">
                    <button type="button" className="arow__title" onClick={() => setEdit(f)}>{f.name}</button>
                    <p className="arow__meta">
                      <StateBadge visibility={f.visibility} status={f.status} />
                      <span className="tag">{kindLabel(f.kind)}</span>
                      <span className="arow__id">{formatBytes(f.size)}</span>
                      <time>{f.date ?? f.updated_at.slice(0, 10)}</time>
                    </p>
                  </div>
                  <div className="arow__actions">
                    <a className="icon-btn" href={files.contentUrl(f.id)} target="_blank" rel="noopener noreferrer" aria-label={`预览「${f.name}」`} title="预览（新窗口）"><IconExternal size={17} /></a>
                    <a className="icon-btn" href={files.contentUrl(f.id, true)} aria-label={`下载「${f.name}」`} title="下载"><IconDownload size={17} /></a>
                    <button type="button" className="chip chip--sm" aria-pressed={live} onClick={() => quickToggle(f)} title={live ? '点击收回' : '点击公开'}>{live ? '已公开' : '公开'}</button>
                    <button type="button" className="icon-btn" aria-label={`编辑「${f.name}」`} title="编辑" onClick={() => setEdit(f)}><IconEdit size={17} /></button>
                    <button type="button" className="icon-btn icon-btn--danger" aria-label={`删除「${f.name}」`} title="删除" onClick={() => setDel(f)}><IconTrash size={17} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {edit && <FileEditor file={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); state.retry(); }} />}
      {del && (
        <ConfirmDialog title="删除这个文件？" confirmLabel="删除" danger busy={deleting} onConfirm={doDelete} onCancel={() => setDel(null)}>
          <p>「{del.name}」会从服务器上永久删除，无法恢复。{isLive(del.visibility, del.status) && '它现在是公开的，已发出去的链接会失效。'}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
