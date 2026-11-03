import { useEffect } from 'react';

/** 页面不该被收录（404 / 内容不存在）时加 <meta name="robots" content="noindex">，离开页面后移除。只对执行 JS 的爬虫有效。 */
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}
