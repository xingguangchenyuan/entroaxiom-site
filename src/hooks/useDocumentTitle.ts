import { useEffect } from 'react';
import { documentTitle } from '../config/site';

/**
 * 页面标题（设计文档 §13 / §12.3）
 * - 首页与欢迎页：`entroaxiom`
 * - 模块页：`学习笔记 · entroaxiom`；内容页：`<标题> · entroaxiom`；404：`页面不存在 · entroaxiom`
 */
export function useDocumentTitle(suffix?: string): void {
  useEffect(() => {
    document.title = documentTitle(suffix);
  }, [suffix]);
}