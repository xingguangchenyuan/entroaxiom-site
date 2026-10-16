import { useEffect, useRef, useState } from 'react';
import { copy } from '../../config/site';
import { IconClose, IconSearch } from '../ui/Icons';

interface Props {
  label: string;
  placeholder: string;
  /** 当前 URL 里的关键词（外部清空、前进后退后同步草稿） */
  currentQuery: string;
  onSubmit: (q: string) => void;
}

/**
 * 搜索框：边输入边筛选（220ms 防抖后写入 URL）；Esc 或 × 清空。
 * 输入法组合输入（拼音未确认）期间不提交，避免半截拼音触发筛选。
 */
export function SearchBox({ label, placeholder, currentQuery, onSubmit }: Props) {
  const [draft, setDraft] = useState(currentQuery);
  const composing = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => setDraft(currentQuery), [currentQuery]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const schedule = (v: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!composing.current) onSubmit(v.trim());
    }, 220);
  };

  return (
    <div className="slot search-box">
      <IconSearch className="slot__icon" />
      <label className="sr-only" htmlFor="search-input">{label}</label>
      <input
        id="search-input"
        type="search"
        value={draft}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value);
          schedule(e.target.value);
        }}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={(e) => {
          composing.current = false;
          schedule((e.target as HTMLInputElement).value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            window.clearTimeout(timer.current);
            onSubmit(draft.trim());
          } else if (e.key === 'Escape' && draft) {
            setDraft('');
            onSubmit('');
          }
        }}
      />
      {draft !== '' && (
        <button
          type="button"
          className="search-box__clear"
          aria-label={copy.clearSearch}
          onClick={() => {
            setDraft('');
            onSubmit('');
          }}
        >
          <IconClose size={15} />
        </button>
      )}
    </div>
  );
}
