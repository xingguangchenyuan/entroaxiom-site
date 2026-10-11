import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const ALL = '全部';

interface ListQuery {
  /** 关键词（已去首尾空格），空串表示未搜索 */
  query: string;
  /** 分类，「全部」表示未筛选 */
  category: string;
  setQuery: (q: string) => void;
  setCategory: (category: string) => void;
  clear: () => void;
}

/**
 * 列表页 URL query 读写（设计文档 §10.1）
 * - 搜索词 q 与分类 cat 写进 URL，便于分享和前进后退；
 * - q 为空、cat 为「全部」时不写入 URL，保持地址干净；
 * - 提交用 navigate(replace:true)，不填进历史记录。
 */
export function useListQuery(): ListQuery {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);
  const category = useMemo(() => searchParams.get('cat') ?? ALL, [searchParams]);

  const commit = useCallback(
    (next: { q?: string; cat?: string }) => {
      const params = new URLSearchParams();
      const q = (next.q ?? query).trim();
      const cat = next.cat ?? category;
      if (q) params.set('q', q);
      if (cat && cat !== ALL) params.set('cat', cat);
      const search = params.toString();
      navigate(search ? `${location.pathname}?${search}` : location.pathname, {
        replace: true,
      });
    },
    [query, category, location.pathname, navigate],
  );

  const setQuery = useCallback((q: string) => commit({ q }), [commit]);
  const setCategory = useCallback((cat: string) => commit({ cat }), [commit]);
  const clear = useCallback(() => navigate(location.pathname, { replace: true }), [navigate, location.pathname]);

  return { query, category, setQuery, setCategory, clear };
}