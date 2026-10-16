import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchEntries, type Entry } from '../../content/corpus';
import { useCorpus } from '../../hooks/useCorpus';
import { navItems } from '../../config/site';
import { worldByKey } from '../../config/worlds';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDrift } from '../../hooks/useDrift';
import { IconDrift, IconFile, IconNote, IconSearch, IconSummary, IconArrow } from '../ui/Icons';

interface PaletteApi {
  open: () => void;
  close: () => void;
}
const Ctx = createContext<PaletteApi | null>(null);

export function usePalette(): PaletteApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePalette 必须在 PaletteProvider 内使用');
  return v;
}

const kindIcon = { notes: IconNote, summaries: IconSummary, files: IconFile } as const;

interface Row {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: ReactNode;
  run: () => void;
}

/**
 * 全站搜索面板（Ctrl/⌘ + K，或在非输入状态按 /）
 * 数据来自 corpus（公开接口的列表），只搜标题、摘要、标签、分类。
 * 组合框语义：input[role=combobox] + listbox，↑↓ 选择，Enter 前往，Esc 关闭。
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Ctx.Provider value={api}>
      {children}
      {isOpen && <PaletteDialog onClose={close} />}
    </Ctx.Provider>
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const drift = useDrift();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const contentState = useCorpus();
  const corpus = contentState.status === 'ready' ? contentState.corpus : null;
  const failed = contentState.status === 'error';

  useBodyScrollLock(true);
  useFocusTrap(true, boxRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, [corpus]);

  const go = useCallback(
    (to: string) => {
      onClose();
      navigate(to);
    },
    [navigate, onClose],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const entryRow = (e: Entry, group: string): Row => {
      const Icon = kindIcon[e.kind];
      return { id: `${e.kind}:${e.id}`, label: e.title, hint: e.category ?? worldByKey[e.kind].module, group, icon: <Icon size={16} />, run: () => go(e.to) };
    };
    if (q.trim()) {
      const hits = corpus ? searchEntries(corpus.entries, q, 10) : [];
      hits.forEach((e) => out.push(entryRow(e, '搜索结果')));
    } else {
      navItems.forEach((n) => out.push({ id: `nav:${n.to}`, label: n.label, group: '前往', icon: <IconArrow size={16} />, run: () => go(n.to) }));
      out.push({ id: 'drift', label: '漂流：随机去一篇内容', group: '前往', icon: <IconDrift size={16} />, run: () => { onClose(); drift(); } });
      if (corpus) {
        [...corpus.entries]
          .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
          .slice(0, 5)
          .forEach((e) => out.push(entryRow(e, '最近')));
      }
    }
    return out;
  }, [q, corpus, go, drift, onClose]);

  useEffect(() => setActive(0), [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      rows[active]?.run();
    }
  };

  useEffect(() => {
    document.getElementById(`pal-opt-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  let lastGroup = '';
  return (
    <div className="palette" onKeyDown={onKeyDown}>
      <div className="palette__scrim" onClick={onClose} aria-hidden="true" />
      <div className="palette__box glass lit" role="dialog" aria-modal="true" aria-label="搜索全站" ref={boxRef}>
        <div className="slot palette__slot">
          <IconSearch className="slot__icon" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={rows.length ? `pal-opt-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="搜索笔记、总结、文件、标签"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette__esc">Esc</kbd>
        </div>
        <ul id="pal-list" className="palette__list" role="listbox" aria-label="结果">
          {rows.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <li key={r.id} role="presentation">
                {header && <p className="palette__group">{header}</p>}
                <div
                  id={`pal-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`palette__row${i === active ? ' is-active' : ''}`}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={r.run}
                >
                  <span className="palette__icon">{r.icon}</span>
                  <span className="palette__label">{r.label}</span>
                  {r.hint && <span className="palette__hint">{r.hint}</span>}
                </div>
              </li>
            );
          })}
          {q.trim() && corpus && rows.length === 0 && <li className="palette__empty" role="presentation">没有找到「{q.trim()}」相关的内容</li>}
          {!corpus && !failed && <li className="palette__empty" role="presentation">正在加载内容索引…</li>}
          {failed && <li className="palette__empty" role="presentation">内容索引加载失败，仍可使用上方的页面导航</li>}
        </ul>
      </div>
    </div>
  );
}
