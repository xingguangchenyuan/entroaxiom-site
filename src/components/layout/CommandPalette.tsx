import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { byRecent, searchEntries, type Entry } from '../../content/corpus';
import { useCorpus } from '../../hooks/useCorpus';
import { navItems } from '../../config/site';
import { worldByKey } from '../../config/worlds';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDrift } from '../../hooks/useDrift';
import { isImeComposing } from '../../lib/ime';
import { OTHER_MODAL_SELECTOR, paletteShortcut } from '../../lib/paletteShortcut';
import { IconDrift, IconFile, IconNote, IconSearch, IconArrow, IconFeather, IconBook } from '../ui/Icons';

interface PaletteApi {
  open: () => void;
  close: () => void;
}
const Ctx = createContext<PaletteApi | null>(null);

/** 除命令面板外是否已有模态弹层（图片灯箱、书影音抽屉、欢迎层） */
function hasOtherModalOpen(): boolean {
  return document.querySelector(OTHER_MODAL_SELECTOR) !== null;
}

export function usePalette(): PaletteApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePalette 必须在 PaletteProvider 内使用');
  return v;
}

const kindIcon = { essays: IconFeather, notes: IconNote, files: IconFile, shelf: IconBook } as const;

interface Row {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: ReactNode;
  color?: string;
  run: () => void;
}

/**
 * 全站检索面板（Ctrl/⌘ + K，或在非输入状态按 /）
 * 数据来自 corpus：随笔、笔记、文件、书影音。
 * 组合框语义：input[role=combobox] + listbox，↑↓ 选择，Enter 前往，Esc 关闭。
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  // 已打开时再 setOpen(true) 是空操作，所以不需要依赖 isOpen，open 的引用保持稳定
  const open = useCallback(() => {
    if (hasOtherModalOpen()) return;
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const api = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const d = paletteShortcut(e, { isOpen, typing, otherModalOpen: hasOtherModalOpen() });
      if (d.preventDefault) e.preventDefault();
      if (d.action === 'open') setOpen(true);
      else if (d.action === 'close') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

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
      const w = worldByKey[e.kind];
      return { id: `${e.kind}:${e.id}`, label: e.title, hint: e.category ?? w.module, group, icon: <Icon size={16} />, color: w.color, run: () => go(e.to) };
    };
    if (q.trim()) {
      const hits = corpus ? searchEntries(corpus.entries, q, 12) : [];
      hits.forEach((e) => out.push(entryRow(e, '搜索结果')));
    } else {
      navItems.forEach((n) => out.push({ id: `nav:${n.to}`, label: n.label, hint: n.latin, group: '前往', icon: <IconArrow size={16} />, color: n.color, run: () => go(n.to) }));
      out.push({ id: 'drift', label: '漂流：随机去一篇内容', group: '前往', icon: <IconDrift size={16} />, run: () => { onClose(); drift(); } });
      if (corpus) {
        [...corpus.entries]
          .filter((e) => e.kind !== 'files')
          .sort(byRecent)
          .slice(0, 5)
          .forEach((e) => out.push(entryRow(e, '最近亮起')));
      }
    }
    return out;
  }, [q, corpus, go, drift, onClose]);

  useEffect(() => setActive(0), [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // 输入法候选未上屏时，回车/方向键/Esc 是给输入法的：不跳转、不移动选中项、不关面板
    if (isImeComposing(e.nativeEvent)) return;
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

  // 读屏用的状态播报：输入后有多少条结果 / 没有结果 / 还在加载
  const statusText = failed
    ? '星表加载失败，仍可使用页面导航'
    : !corpus
      ? '正在校准星表'
      : q.trim()
        ? rows.length > 0 ? `${rows.length} 条结果` : '没有找到结果'
        : '';

  let lastGroup = '';
  return (
    <div className="palette" onKeyDown={onKeyDown}>
      <div className="palette__scrim" data-overlay-scrim onClick={onClose} aria-hidden="true" />
      <div className="palette__box glass lit" role="dialog" aria-modal="true" aria-label="检索星空" ref={boxRef}>
        <div className="slot palette__slot">
          <IconSearch className="slot__icon" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="搜索站内内容"
            aria-expanded={rows.length > 0}
            aria-controls="pal-list"
            aria-activedescendant={rows.length ? `pal-opt-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="搜索随笔、笔记、书影音、文件、标签"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette__esc">Esc</kbd>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{statusText}</p>
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
                  style={r.color ? ({ ['--hue' as string]: r.color } as CSSProperties) : undefined}
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
          {q.trim() && corpus && rows.length === 0 && <li className="palette__empty" role="presentation">星空里没有找到「{q.trim()}」</li>}
          {!corpus && !failed && <li className="palette__empty" role="presentation">正在校准星表…</li>}
          {failed && <li className="palette__empty" role="presentation">星表加载失败，仍可使用上方的页面导航</li>}
        </ul>
      </div>
    </div>
  );
}
