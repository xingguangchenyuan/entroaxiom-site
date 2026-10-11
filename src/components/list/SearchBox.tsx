import { useEffect, useState } from 'react';
import { copy } from '../../config/site';

interface Props {
  /** 视觉隐藏的 label 文本，placeholder 单独给 */
  label: string;
  placeholder: string;
  /** 当前 URL 里的关键词（用于外部清空/前进后退后同步草稿） */
  currentQuery: string;
  /** 提交（回车/点按钮） */
  onSubmit: (q: string) => void;
}

/**
 * 搜索框（设计文档 §10）
 * - 输入为本地草稿；回车或点击「搜索」才提交（写 URL）；
 * - 右侧清空按钮（aria-label=清空搜索），清空后恢复全部结果。
 */
export function SearchBox({ label, placeholder, currentQuery, onSubmit }: Props) {
  const [draft, setDraft] = useState(currentQuery);

  useEffect(() => {
    setDraft(currentQuery);
  }, [currentQuery]);

  const submit = () => onSubmit(draft.trim());

  return (
    <div className="search-box">
      <label className="visually-hidden" htmlFor="search-input">
        {label}
      </label>
      <input
        id="search-input"
        type="search"
        className="search-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="search-submit" onClick={submit}>
        {copy.searchSubmit}
      </button>
      {draft !== '' && (
        <button
          type="button"
          className="search-clear"
          aria-label={copy.clearSearch}
          onClick={() => {
            setDraft('');
            onSubmit('');
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}