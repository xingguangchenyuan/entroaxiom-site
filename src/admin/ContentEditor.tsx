import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { AdminApiError, content, files, validationField, type AdminContent, type AdminFile, type ContentModule, type Status, type Visibility } from '../lib/adminApi';
import { useAsync } from '../hooks/useAsync';
import { Markdown } from '../components/reading/Markdown';
import { Knob } from '../components/ui/Knob';
import { Segmented } from '../components/ui/Segmented';
import { ErrorState } from '../components/state/ErrorState';
import { IconBack, IconPlus } from '../components/ui/Icons';
import { ConfirmDialog } from './ConfirmDialog';
import { StateBadge, isLive } from './status';
import { useToast } from './Toast';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Draft {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  body: string;
  date: string;
  visibility: Visibility;
  status: Status;
}
const EMPTY: Draft = { id: '', title: '', summary: '', category: '', tags: [], body: '', date: '', visibility: 'private', status: 'draft' };
const fromServer = (c: AdminContent): Draft => ({ id: c.id, title: c.title, summary: c.summary, category: c.category ?? '', tags: c.tags, body: c.body, date: c.date ?? '', visibility: c.visibility, status: c.status });
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);
type Mode = 'write' | 'split' | 'preview';
const LABEL: Record<ContentModule, string> = { notes: '学习笔记', summaries: '文章总结' };

/** 从后端 422 的 details 里取出出错字段，用于高亮输入框 */
function fieldOf(err: unknown): string | null {
  if (!(err instanceof AdminApiError) || err.code !== 'VALIDATION_ERROR' || !Array.isArray(err.details)) return null;
  return validationField(err.details);
}

/** 插入图片：只列出已公开的图片（访客才能看到）。私密图片插进公开文章会变成裂图，所以不列 */
function ImagePicker({ onPick, onClose }: { onPick: (f: AdminFile) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(true, ref);
  const state = useAsync(() => files.list(), []);
  const imgs = state.status === 'ready' ? state.data.filter((f) => f.kind === 'image' && f.exposed) : [];
  return (
    <div className="dialog" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="dialog__scrim" onClick={onClose} aria-hidden="true" />
      <div className="dialog__box dialog__box--wide glass" role="dialog" aria-modal="true" aria-labelledby="pick-t" ref={ref}>
        <h2 id="pick-t" className="dialog__title display">插入图片</h2>
        <div className="dialog__body">
          {state.status === 'loading' && <p>正在读取文件库…</p>}
          {state.status === 'error' && <ErrorState onRetry={state.retry} />}
          {state.status === 'ready' && imgs.length === 0 && <p>文件库里还没有公开的图片。先在“文件”里上传，并设为“公开 + 已发布”。</p>}
          {imgs.length > 0 && (
            <ul className="picker">
              {imgs.map((f) => (
                <li key={f.id}>
                  <button type="button" className="picker__item" onClick={() => onPick(f)}>
                    <img src={f.src} alt="" loading="lazy" />
                    <span>{f.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dialog__actions"><Knob tone="dark" size="sm" onClick={onClose}>关闭</Knob></div>
      </div>
    </div>
  );
}

interface Props {
  module: ContentModule;
  /** null 表示新建；任何合法字符串（包括 new）都表示已有内容。 */
  id: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function ContentEditor({ module, id, onClose, onSaved, onDirtyChange }: Props) {
  const toast = useToast();
  const isNew = id === null;
  const state = useAsync<Draft>(() => (id === null ? Promise.resolve(EMPTY) : content.get(module, id).then(fromServer)), [module, id]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [base, setBase] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errField, setErrField] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('split');
  const [tagInput, setTagInput] = useState('');
  const [picking, setPicking] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const allowSavedNavigation = useRef(false);

  const loaded = state.status === 'ready' ? state.data : null;
  useEffect(() => {
    if (loaded) {
      setDraft(loaded);
      setBase(loaded);
      setErrField(null);
      setErrMsg(null);
    }
  }, [loaded]);

  const dirty = !same(draft, base) || Boolean(tagInput.trim());
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !allowSavedNavigation.current && (dirty || savingRef.current) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  const patch = (p: Partial<Draft>) => { if (!savingRef.current) setDraft((d) => ({ ...d, ...p })); };

  useEffect(() => {
    onDirtyChange(dirty || saving);
    return () => onDirtyChange(false);
  }, [dirty, saving, onDirtyChange]);

  useEffect(() => {
    // 保存期间不可继续输入，避免响应覆盖刚输入的新内容；inert 不影响布局或样式。
    if (fieldsRef.current) fieldsRef.current.inert = saving;
  }, [saving, loaded]);

  // 有未保存修改时，关闭标签页 / 刷新前提示
  useEffect(() => {
    if (!dirty && !saving) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, saving]);

  const addTags = (raw: string) => {
    if (savingRef.current) return;
    const parts = raw.split(/[,，、\n]/).map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    setDraft((d) => ({ ...d, tags: [...d.tags, ...parts.filter((t) => !d.tags.includes(t))] }));
    setTagInput('');
  };

  const save = useCallback(async () => {
    if (savingRef.current || !loaded) return;
    if (!draft.title.trim()) {
      setErrField('title');
      setErrMsg('请先写一个标题');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setErrField(null);
    setErrMsg(null);
    try {
      const tags = tagInput.trim() ? [...draft.tags, ...tagInput.split(/[,，、]/).map((t) => t.trim()).filter((t) => t && !draft.tags.includes(t))] : draft.tags;
      const common = {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        category: draft.category.trim() || null,
        tags,
        body: draft.body,
        date: draft.date || null,
        visibility: draft.visibility,
        status: draft.status,
      };
      const saved = id === null
        ? await content.create(module, { ...common, ...(draft.id.trim() ? { id: draft.id.trim() } : {}) })
        : await content.update(module, id, { ...common, ...(draft.id.trim() && draft.id.trim() !== id ? { id: draft.id.trim() } : {}) });
      const next = fromServer(saved);
      setDraft(next);
      setBase(next);
      setTagInput('');
      toast.push(isLive(next.visibility, next.status) ? '已保存，访客可以看到最新内容' : '已保存（访客暂时看不到）');
      allowSavedNavigation.current = true;
      onSaved(saved.id);
    } catch (e) {
      setErrField(fieldOf(e));
      setErrMsg(e instanceof Error ? e.message : '保存失败');
      toast.push(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      allowSavedNavigation.current = false;
      savingRef.current = false;
      setSaving(false);
    }
  }, [loaded, draft, tagInput, module, id, toast, onSaved]);

  // Ctrl/⌘ + S 保存
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [save]);

  const insertAtCursor = (text: string) => {
    const el = bodyRef.current;
    if (!el) {
      patch({ body: draft.body + text });
      return;
    }
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const next = draft.body.slice(0, s) + text + draft.body.slice(e);
    patch({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + text.length;
    });
  };

  const words = useMemo(() => (draft.body.match(/[㐀-鿿]/g)?.length ?? 0) + (draft.body.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g)?.length ?? 0), [draft.body]);

  if (state.status === 'loading') return <div className="skeleton skeleton--stage" aria-busy="true" />;
  if (state.status === 'error') return <ErrorState onRetry={state.retry} message={state.error instanceof Error ? state.error.message : undefined} />;

  const bad = (f: string) => (errField === f ? ' slot--error' : '');

  return (
    <section className="editor" aria-label={`${isNew ? '新建' : '编辑'}${LABEL[module]}`}>
      <div className="editor__bar">
        <button type="button" className="text-action" onClick={onClose}><IconBack size={15} /> 返回列表</button>
        <div className="editor__bar-right">
          {dirty && <span className="editor__dirty"><span className="led led--warn" /> 有未保存的修改</span>}
          {!dirty && !isNew && <StateBadge visibility={draft.visibility} status={draft.status} />}
          <Knob size="sm" onClick={save} busy={saving} disabled={!dirty && !isNew}>保存</Knob>
        </div>
      </div>

      {errMsg && <p className="form-error" role="alert">{errMsg}</p>}

      <div className="editor__grid" ref={fieldsRef}>
        <div className="editor__main">
          <label className="field">
            <span className="field__l">标题</span>
            <span className={`slot${bad('title')}`}><input value={draft.title} onChange={(e) => patch({ title: e.target.value })} maxLength={200} placeholder="这篇内容叫什么" /></span>
          </label>
          <label className="field">
            <span className="field__l">摘要 <em>列表页与分享里显示，建议 40～80 字</em></span>
            <span className={`slot slot--area${bad('summary')}`}><textarea rows={2} value={draft.summary} onChange={(e) => patch({ summary: e.target.value })} maxLength={500} /></span>
          </label>

          <div className="field">
            <div className="field__row">
              <span className="field__l">正文（Markdown） <em>{words} 字</em></span>
              <div className="field__tools">
                <button type="button" className="text-action" onClick={() => setPicking(true)}><IconPlus size={14} /> 插入图片</button>
                <Segmented<Mode> label="编辑模式" value={mode} onChange={setMode} options={[{ value: 'write', label: '编辑' }, { value: 'split', label: '分栏' }, { value: 'preview', label: '预览' }]} />
              </div>
            </div>
            <div className={`editor__panes editor__panes--${mode}`}>
              {mode !== 'preview' && (
                <span className={`slot slot--area editor__src${bad('body')}`}>
                  <textarea ref={bodyRef} value={draft.body} onChange={(e) => patch({ body: e.target.value })} spellCheck={false} aria-label="Markdown 正文" />
                </span>
              )}
              {mode !== 'write' && (
                <div className="editor__preview glass glass--flat" aria-label="预览">
                  {draft.body.trim() ? <Markdown body={draft.body} /> : <p className="editor__ph">写点什么，这里会实时显示效果。</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="editor__side glass glass--flat" aria-label="发布设置">
          <div className="field">
            <span className="field__l">谁能看到</span>
            <Segmented<Visibility> label="可见性" value={draft.visibility} onChange={(v) => patch({ visibility: v })} options={[{ value: 'private', label: '仅自己' }, { value: 'public', label: '公开' }]} />
          </div>
          <div className="field">
            <span className="field__l">发布状态</span>
            <Segmented<Status> label="发布状态" value={draft.status} onChange={(v) => patch({ status: v })} options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }]} />
          </div>
          <p className={`editor__live${isLive(draft.visibility, draft.status) ? ' is-live' : ''}`}>
            <span className={`led ${isLive(draft.visibility, draft.status) ? 'led--on' : ''}`} />
            {isLive(draft.visibility, draft.status) ? '保存后，访客可以看到。' : '访客看不到。需要“公开”并且“已发布”。'}
          </p>
          <hr className="horizon" />
          <label className="field">
            <span className="field__l">分类 <em>单个，用于筛选</em></span>
            <span className={`slot${bad('category')}`}><input value={draft.category} onChange={(e) => patch({ category: e.target.value })} maxLength={50} /></span>
          </label>
          <div className="field">
            <span className="field__l">标签 <em>回车添加</em></span>
            <span className={`slot${bad('tags')}`}>
              <input
                value={tagInput}
                placeholder="输入后按回车"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',' || e.key === '，') && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addTags(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && draft.tags.length) {
                    patch({ tags: draft.tags.slice(0, -1) });
                  }
                }}
                onBlur={() => addTags(tagInput)}
              />
            </span>
            {draft.tags.length > 0 && (
              <p className="tagchips">
                {draft.tags.map((t) => (
                  <button key={t} type="button" className="tag tagchip" aria-label={`移除标签 ${t}`} onClick={() => patch({ tags: draft.tags.filter((x) => x !== t) })}>{t} ×</button>
                ))}
              </p>
            )}
          </div>
          <label className="field">
            <span className="field__l">日期 <em>留空则用今天</em></span>
            <span className={`slot${bad('date')}`}><input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} /></span>
          </label>
          <label className="field">
            <span className="field__l">地址标识 <em>{isNew ? '留空则自动生成' : '修改会改变访问链接'}</em></span>
            <span className={`slot${bad('id')}`}><input value={draft.id} onChange={(e) => patch({ id: e.target.value })} placeholder="小写字母、数字、连字符" maxLength={80} /></span>
          </label>
        </aside>
      </div>

      {blocker.state === 'blocked' && (
        <ConfirmDialog title={saving ? '正在保存，请稍候' : '放弃未保存的修改？'} confirmLabel="放弃修改" danger busy={saving} onConfirm={() => blocker.proceed()} onCancel={() => blocker.reset()}>
          <p>{saving ? '保存完成前请不要离开。' : '离开后，刚才写的内容不会保留。'}</p>
        </ConfirmDialog>
      )}
      {picking && (
        <ImagePicker
          onClose={() => setPicking(false)}
          onPick={(f) => {
            setPicking(false);
            insertAtCursor(`\n![${f.name.replace(/\.[^.]+$/, '')}](${f.src})\n`);
          }}
        />
      )}
    </section>
  );
}
