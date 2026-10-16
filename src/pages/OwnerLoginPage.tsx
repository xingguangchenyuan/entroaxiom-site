import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AdminApiError } from '../lib/adminApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Knob } from '../components/ui/Knob';
import { IconEye, IconEyeOff, IconLock } from '../components/ui/Icons';

/** 把后端的错误码翻译成对站长有用的话（错误不道歉，直接说明原因和下一步） */
function explain(e: unknown): { text: string; wait?: number } {
  if (!(e instanceof AdminApiError)) return { text: '登录失败，请稍后再试。' };
  switch (e.code) {
    case 'INVALID_CREDENTIALS':
      return { text: '密码不对。再试一次。' };
    case 'TOO_MANY_ATTEMPTS':
      return { text: e.message, wait: e.retryAfter };
    case 'ADMIN_NOT_CONFIGURED':
      return { text: '服务器还没有设置管理员密码。请在后端的 .env 里配置 ADMIN_PASSWORD_HASH，然后重启后端。' };
    case 'CSRF_REJECTED':
      return { text: '请求来源不被允许。请用站点自己的域名访问，不要通过其他地址或端口。' };
    case 'NETWORK_ERROR':
      return { text: '连接不上服务器。确认后端已启动、Nginx 已把 /api 转发给它。' };
    case 'VALIDATION_ERROR':
      return { text: '请输入密码。' };
    default:
      return { text: e.message || '登录失败，请稍后再试。' };
  }
}

export function OwnerLoginPage() {
  useDocumentTitle('站长入口');
  const { status, available, check, login } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [shake, setShake] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // 进入页面时确认一次登录态；已登录直接去控制台
  useEffect(() => {
    if (available) void check().then((ok) => ok && navigate('/console', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (status === 'owner') navigate('/console', { replace: true });
  }, [status, navigate]);

  // 限流倒计时
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => window.clearInterval(t);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || wait > 0) return;
    if (!pw) {
      setErr('请输入密码。');
      setShake((n) => n + 1);
      input.current?.focus();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await login(pw);
      setPw('');
      navigate('/console', { replace: true });
    } catch (e2) {
      const x = explain(e2);
      setErr(x.text);
      if (x.wait) setWait(x.wait);
      setShake((n) => n + 1);
      setPw('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="page owner" tabIndex={-1}>
      <div className="owner__wrap">
        <form className="owner__card glass lit" onSubmit={submit} noValidate aria-labelledby="owner-h" key={shake} data-shake={shake > 0 ? '1' : undefined}>
          <div className="owner__seal" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" stroke="currentColor" strokeOpacity=".35" />
              <ellipse cx="32" cy="32" rx="30" ry="11" transform="rotate(-24 32 32)" stroke="var(--axiom)" strokeWidth="1.6" />
              <circle cx="32" cy="32" r="8.5" fill="#000" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
          <h1 id="owner-h" className="owner__title display">站长入口</h1>
          <p className="owner__lead">视界之外，只对站长开放。</p>

          {!available ? (
            <p className="form-error form-error--info" role="status">当前是演示模式，没有后端，无法登录。用正式模式构建并启动后端后，这里才能使用。</p>
          ) : (
            <>
              <label className="field owner__field">
                <span className="field__l">密码</span>
                <span className={`slot${err ? ' slot--error' : ''}`}>
                  <IconLock size={18} className="slot__icon" />
                  <input
                    ref={input}
                    type={show ? 'text' : 'password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    spellCheck={false}
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? 'owner-err' : undefined}
                    disabled={busy}
                  />
                  <button type="button" className="icon-btn" aria-label={show ? '隐藏密码' : '显示密码'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
                    {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </span>
              </label>
              <div className="owner__msg" aria-live="polite">
                {err && <p id="owner-err" className="form-error" role="alert">{err}{wait > 0 ? `（${Math.ceil(wait / 60)} 分钟后可再试）` : ''}</p>}
              </div>
              <Knob type="submit" block size="lg" busy={busy} disabled={wait > 0}>{busy ? '正在验证' : '进入控制台'}</Knob>
              {status === 'checking' && <p className="owner__hint">正在确认登录状态…</p>}
            </>
          )}
          <Link to="/" className="text-action owner__back">返回首页</Link>
        </form>
      </div>
    </main>
  );
}
