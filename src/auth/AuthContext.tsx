import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isDemo } from '../content/loader';
import { auth as authApi, onUnauthorized } from '../lib/adminApi';

/**
 * 站长登录态。
 *  - 真正的会话是后端的 HttpOnly Cookie，前端读不到；这里只保存“是否已登录”的判断结果
 *  - 为了不让每个访客都请求 /api/auth/me：只有本机留有“站长提示”（登录成功后写入 localStorage）
 *    或访问站长页面时才去检查。提示只是便利，权限永远以后端为准
 *  - 演示模式（没有后端）不提供登录
 */
export type AuthStatus = 'idle' | 'checking' | 'anon' | 'owner';

interface AuthValue {
  status: AuthStatus;
  /** 本机是否曾以站长身份登录（用于页脚显示“控制台”入口） */
  hinted: boolean;
  available: boolean;
  check: () => Promise<boolean>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const HINT_KEY = 'entroaxiom:owner';
const readHint = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};
const writeHint = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* 隐私模式下忽略 */
  }
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hinted, setHinted] = useState<boolean>(() => !isDemo && readHint());
  const [status, setStatus] = useState<AuthStatus>('idle');

  const check = useCallback(async (): Promise<boolean> => {
    if (isDemo) {
      setStatus('anon');
      return false;
    }
    setStatus('checking');
    try {
      const r = await authApi.me();
      setStatus(r.authenticated ? 'owner' : 'anon');
      setHinted(r.authenticated);
      writeHint(r.authenticated);
      return r.authenticated;
    } catch {
      // 网络失败：不改写提示，状态按未登录处理（页面会显示可重试的提示）
      setStatus('anon');
      return false;
    }
  }, []);

  const login = useCallback(async (password: string) => {
    await authApi.login(password);
    setStatus('owner');
    setHinted(true);
    writeHint(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setStatus('anon');
      setHinted(false);
      writeHint(false);
    }
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setStatus('anon');
      setHinted(false);
      writeHint(false);
    });
    return () => onUnauthorized(null);
  }, []);

  useEffect(() => {
    if (hinted) void check();
    // 只在挂载时按提示检查一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthValue>(() => ({ status, hinted, available: !isDemo, check, login, logout }), [status, hinted, check, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return v;
}
