import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { listGuestbook, postGuestbook, ApiRequestError } from '../content/loader';
import type { GuestMessage } from '../content/types';
import { worldByKey } from '../config/worlds';
import { copy } from '../config/site';
import { formatDateTime } from '../lib/format';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { GUEST_LIMITS, charCount, validateGuest, validationField, type GuestErrors, type GuestForm } from '../lib/guestbook';
import { ModuleHeader } from '../components/list/ModuleHeader';
import { DemoBadge } from '../components/list/DemoBadge';
import { Sigil, SIGIL_KEYS, SIGIL_META } from '../components/guestbook/Sigil';
import { EmptyState } from '../components/state/EmptyState';
import { ErrorState } from '../components/state/ErrorState';
import { Knob } from '../components/ui/Knob';
import { IconExternal, IconSend } from '../components/ui/Icons';

const PAGE = 12;
const EMPTY: GuestForm = { name: '', email: '', site: '', body: '', sigil: 'moon' };
const DRAFT_KEY = 'entroaxiom:guest-draft';

/** 根据留言 id 计算它在星空里的“轨道倾角”，让每条彗星的拖尾方向不同 */
function tilt(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 50) - 25;
}

function Comet({ m, i }: { m: GuestMessage; i: number }) {
  const meta = SIGIL_META[m.sigil] ?? SIGIL_META.sun;
  return (
    <li className={`comet${m.pending ? ' is-pending' : ''}`} style={{ ['--c' as string]: meta.color, ['--tilt' as string]: `${tilt(m.id)}deg`, ['--i' as string]: i } as CSSProperties}>
      <span className="comet__tail" aria-hidden="true" />
      <div className="comet__head">
        <Sigil sigil={m.sigil} size={34} />
        <div>
          <p className="comet__name">
            {m.site ? (
              <a href={m.site} target="_blank" rel="noreferrer noopener nofollow ugc">
                {m.name} <IconExternal size={12} />
              </a>
            ) : (
              m.name
            )}
          </p>
          <p className="readout comet__time">
            <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
            {m.pending && <span className="comet__pending"> · 正在穿越审核星云</span>}
          </p>
        </div>
      </div>
      <p className="comet__body">{m.body}</p>
      {m.reply && (
        <div className="comet__reply">
          <span className="latin">Responsum</span>
          <p>{m.reply.body}</p>
        </div>
      )}
    </li>
  );
}

/**
 * 留言区：彗星。
 * 左侧是“投递舱”表单：选择一个行星星符作为自己的印记，写下称呼与留言（邮箱不公开，仅用于回复通知）。
 * 右侧是留言流，每条留言是一颗拖着尾巴的彗星，颜色取自星符；站长回复以 Responsum 印出。
 * 新留言默认进入审核（pending），只在本机可见，直到后台通过。
 */
export function GuestbookPage() {
  const world = worldByKey.guestbook;
  useDocumentTitle(world.module);

  const [items, setItems] = useState<GuestMessage[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [more, setMore] = useState(false);

  const [form, setForm] = useState<GuestForm>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState<GuestErrors>({});
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [honey, setHoney] = useState('');

  const load = useCallback(async (offset: number) => {
    try {
      if (offset === 0) setStatus('loading');
      else setMore(true);
      const page = await listGuestbook(offset, PAGE);
      setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items.filter((m) => !prev.some((p) => p.id === m.id))]));
      setTotal(page.total);
      setStatus('ready');
    } catch {
      if (offset === 0) setStatus('error');
    } finally {
      setMore(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name: form.name, site: form.site, body: form.body, sigil: form.sigil }));
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [form]);

  const update = <K extends keyof GuestForm>(k: K, v: GuestForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof GuestErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (honey) return; // 机器人
    const { errors: errs, draft } = validateGuest(form);
    setErrors(errs);
    if (!draft) {
      setNotice({ tone: 'err', text: '有几处需要修改一下。' });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const receipt = await postGuestbook(draft);
      const mine: GuestMessage = {
        id: receipt.id,
        name: draft.name,
        site: draft.site,
        body: draft.body,
        sigil: draft.sigil,
        createdAt: receipt.createdAt,
        pending: receipt.status === 'pending',
      };
      setItems((prev) => [mine, ...prev]);
      if (receipt.status === 'approved') setTotal((t) => (t ?? 0) + 1);
      setForm((f) => ({ ...EMPTY, name: f.name, site: f.site, email: f.email, sigil: f.sigil }));
      setNotice({ tone: 'ok', text: receipt.status === 'pending' ? '已投递。它正在穿越审核星云，通过后所有人都能看见。' : '已投递，彗星已经升空。' });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'RATE_LIMITED') setNotice({ tone: 'err', text: '投递太频繁了，歇一会儿再来。' });
        else if (err.status === 422) {
          const f = validationField(err.details);
          if (f) setErrors({ [f]: err.message || '这一项不符合要求' });
          setNotice({ tone: 'err', text: err.message || '内容没有通过校验。' });
        } else setNotice({ tone: 'err', text: err.message || copy.loadFailed });
      } else setNotice({ tone: 'err', text: copy.loadFailed });
    } finally {
      setSending(false);
    }
  };

  const bodyLen = charCount(form.body);
  const left = GUEST_LIMITS.body - bodyLen;
  const canMore = total != null && items.filter((m) => !m.pending).length < total;
  const sigilMeta = SIGIL_META[form.sigil];

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((m) => (c[m.sigil] = (c[m.sigil] ?? 0) + 1));
    return c;
  }, [items]);

  return (
    <main id="main" className="page" tabIndex={-1} data-hue={world.hue}>
      <ModuleHeader world={world} total={total} unit="颗彗星">
        <DemoBadge />
      </ModuleHeader>

      <div className="gb">
        <form className="gb-form" onSubmit={submit} noValidate style={{ ['--c' as string]: sigilMeta.color } as CSSProperties} aria-labelledby="gb-form-title">
          <h2 id="gb-form-title" className="gb-form__title display">
            <Sigil sigil={form.sigil} size={40} /> 投递一颗彗星
          </h2>

          <fieldset className="gb-sigils">
            <legend>选一个星符作为你的印记</legend>
            <div className="gb-sigils__row">
              {SIGIL_KEYS.map((k) => (
                <label key={k} className="gb-sigil" style={{ ['--c' as string]: SIGIL_META[k].color } as CSSProperties}>
                  <input type="radio" name="sigil" value={k} checked={form.sigil === k} onChange={() => update('sigil', k)} className="sr-only" />
                  <Sigil sigil={k} size={36} />
                  <span className="gb-sigil__name">{SIGIL_META[k].name}</span>
                  {stats[k] ? <span className="gb-sigil__n mono">{stats[k]}</span> : null}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="gb-field">
            <label htmlFor="gb-name">称呼 *</label>
            <input id="gb-name" className="slot" value={form.name} maxLength={GUEST_LIMITS.name * 2} onChange={(e) => update('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'gb-name-err' : undefined} autoComplete="nickname" />
            {errors.name && <p id="gb-name-err" className="gb-err">{errors.name}</p>}
          </div>

          <div className="gb-field gb-field--half">
            <label htmlFor="gb-email">邮箱 <span className="gb-hint">不公开，仅用于回复通知</span></label>
            <input id="gb-email" className="slot" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'gb-email-err' : undefined} autoComplete="email" />
            {errors.email && <p id="gb-email-err" className="gb-err">{errors.email}</p>}
          </div>
          <div className="gb-field gb-field--half">
            <label htmlFor="gb-site">网址 <span className="gb-hint">可选</span></label>
            <input id="gb-site" className="slot" value={form.site} onChange={(e) => update('site', e.target.value)} placeholder="example.com" aria-invalid={!!errors.site} aria-describedby={errors.site ? 'gb-site-err' : undefined} autoComplete="url" />
            {errors.site && <p id="gb-site-err" className="gb-err">{errors.site}</p>}
          </div>

          <div className="gb-field">
            <label htmlFor="gb-body">留言 *</label>
            <textarea id="gb-body" className="slot gb-body" rows={5} value={form.body} onChange={(e) => update('body', e.target.value)} placeholder={copy.placeholder.guestbook} aria-invalid={!!errors.body} aria-describedby="gb-body-count" />
            <p id="gb-body-count" className={`gb-count mono${left < 0 ? ' is-over' : left < 40 ? ' is-near' : ''}`} aria-live="polite">
              {errors.body ? <span className="gb-err">{errors.body}</span> : <span />} {bodyLen} / {GUEST_LIMITS.body}
            </p>
          </div>

          {/* 蜜罐：对人隐藏 */}
          <div className="gb-honey" aria-hidden="true">
            <label>
              不要填写
              <input tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} />
            </label>
          </div>

          <div className="gb-actions">
            <Knob type="submit" busy={sending} disabled={sending}>
              <IconSend size={16} /> {sending ? '投递中…' : '升空'}
            </Knob>
            <p className="gb-rule">留言会先经过审核；请友善，不要留下他人的隐私。</p>
          </div>
          {notice && (
            <p className={`gb-notice gb-notice--${notice.tone}`} role={notice.tone === 'err' ? 'alert' : 'status'}>
              {notice.text}
            </p>
          )}
        </form>

        <section className="gb-stream" aria-label="留言">
          {status === 'loading' && <div className="skeleton"><div className="skeleton__row" /><div className="skeleton__row" /></div>}
          {status === 'error' && <ErrorState onRetry={() => void load(0)} />}
          {status === 'ready' && items.length === 0 && <EmptyState message={copy.empty.guestbook} hint="成为第一颗划过这里的彗星。" />}
          {items.length > 0 && (
            <ol className="comets" role="list">
              {items.map((m, i) => (
                <Comet key={m.id} m={m} i={i} />
              ))}
            </ol>
          )}
          {canMore && (
            <div className="gb-more">
              <Knob tone="dark" size="sm" busy={more} onClick={() => void load(items.filter((m) => !m.pending).length)}>
                更早的彗星
              </Knob>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
