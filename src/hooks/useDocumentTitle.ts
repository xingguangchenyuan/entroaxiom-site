import { useEffect } from 'react';
import { documentTitle } from '../config/site';

/**
 * 页面标题；可选的 description 同步写到 <meta name="description">，离开页面后恢复 index.html 里的默认描述。
 * - 首页与欢迎页：`entroaxiom`
 * - 模块页：`学习笔记 · entroaxiom`；内容页：`<标题> · entroaxiom`；404：`页面不存在 · entroaxiom`
 * 注意：这只对执行 JS 的爬虫（如 Googlebot）有效；微信 / X 等分享预览读不到，要预渲染才行。
 */
export function useDocumentTitle(suffix?: string, description?: string): void {
  useEffect(() => {
    document.title = documentTitle(suffix);
  }, [suffix]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const text = description?.replace(/\s+/g, ' ').trim();
    if (!meta || !text) return;
    const original = meta.content;
    meta.content = text.length > 160 ? `${text.slice(0, 157)}…` : text;
    return () => {
      meta.content = original;
    };
  }, [description]);
}
