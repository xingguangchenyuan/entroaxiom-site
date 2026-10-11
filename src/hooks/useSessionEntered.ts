import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SESSION_ENTERED_KEY } from '../config/site';

function readEntered(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ENTERED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 欢迎层开关（设计文档 §6.1）
 * - 同一会话内只播一次：点击「进入网站」写入 sessionStorage；
 * - 深链接（/notes、/files/xxx 等）在应用挂载时立即写入，之后回首页不补播；
 * - 返回 true 表示本会话已进入过，欢迎层不再显示。
 */
export function useSessionEntered(): { entered: boolean; enter: () => void } {
  const location = useLocation();
  const [entered, setEntered] = useState<boolean>(() => readEntered());

  useEffect(() => {
    const isDeepLink = location.pathname !== '/';
    if (isDeepLink && !entered) {
      try {
        sessionStorage.setItem(SESSION_ENTERED_KEY, '1');
      } catch {
        /* 隐私模式下忽略 */
      }
      setEntered(true);
    }
  }, [location.pathname, entered]);

  const enter = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_ENTERED_KEY, '1');
    } catch {
      /* 隐私模式下忽略 */
    }
    setEntered(true);
  }, []);

  return { entered, enter };
}