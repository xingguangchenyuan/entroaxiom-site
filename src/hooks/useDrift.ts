import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadCorpus } from '../content/corpus';

/** 漂流：随机去往一篇公开内容（不会回到当前页）。没有内容或加载失败时落到星图 */
export function useDrift(): () => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => {
    loadCorpus()
      .then((c) => {
        const pool = c.entries.filter((e) => e.to !== pathname);
        if (pool.length === 0) {
          navigate('/atlas');
          return;
        }
        navigate(pool[Math.floor(Math.random() * pool.length)].to);
      })
      .catch(() => navigate('/atlas'));
  }, [navigate, pathname]);
}
