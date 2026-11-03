import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDrift } from '../hooks/useDrift';
import { useCorpus } from '../hooks/useCorpus';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePalette } from '../components/layout/CommandPalette';
import { Knob } from '../components/ui/Knob';
import { Orrery, type PlanetStat } from '../components/home/Orrery';
import { CometTicker, EssayStrip, NoteLedger, Oracle, Scale, ShelfStrip } from '../components/home/HomeSections';
import { DemoBadge } from '../components/list/DemoBadge';
import { ErrorState } from '../components/state/ErrorState';
import { listGuestbook } from '../content/loader';
import type { GuestMessage } from '../content/types';
import type { WorldKey } from '../config/worlds';

export function HomePage() {
  useDocumentTitle();
  const drift = useDrift();
  const palette = usePalette();
  const c = useCorpus();
  const corpus = c.status === 'ready' ? c.corpus : null;
  const corpusFailed = c.status === 'error';
  // guests 为 null 表示「还没读到」；读取失败单独用 guestsFailed 表示，不再伪装成「0 条留言」
  const [guests, setGuests] = useState<{ items: GuestMessage[]; total: number } | null>(null);
  const [guestsFailed, setGuestsFailed] = useState(false);
  const [guestsNonce, setGuestsNonce] = useState(0);
  const retryGuests = useCallback(() => setGuestsNonce((n) => n + 1), []);

  /** 星系标签上的「共 N 篇 · 最近更新」：按模块统计条目数与最近日期；读取失败的栏目标记 failed */
  const stats = useMemo<Partial<Record<WorldKey, PlanetStat>> | undefined>(() => {
    const out: Partial<Record<WorldKey, PlanetStat>> = {};
    if (corpus) {
      for (const e of corpus.entries) {
        const cur = out[e.kind] ?? { count: 0 };
        cur.count += 1;
        if (e.date && (!cur.latest || e.date > cur.latest)) cur.latest = e.date;
        out[e.kind] = cur;
      }
    } else if (corpusFailed) {
      for (const k of ['essays', 'notes', 'shelf', 'files'] as const) out[k] = { count: 0, failed: true };
    }
    if (guests) {
      const latestGuest = guests.items.reduce<string | undefined>(
        (m, g) => (g.createdAt && (!m || g.createdAt > m) ? g.createdAt : m),
        undefined,
      );
      out.guestbook = { count: guests.total, latest: latestGuest ? latestGuest.slice(0, 10) : undefined };
    } else if (guestsFailed) {
      out.guestbook = { count: 0, failed: true };
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [corpus, corpusFailed, guests, guestsFailed]);

  useEffect(() => {
    let alive = true;
    setGuestsFailed(false);
    listGuestbook(0, 8)
      .then((p) => {
        if (alive) setGuests(p);
      })
      .catch(() => {
        if (alive) setGuestsFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [guestsNonce]);

  return (
    <main id="main" className="home" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-h">
        <div className="hero__copy">
          <p className="hero__kicker latin">Systema · entroaxiom · MMXXVI</p>
          <h1 id="hero-h" className="hero__title display">
            <span className="hero__line">在无序的熵变中，</span>
            <span className="hero__line hero__line--accent">确立世界的公理。</span>
          </h1>
          <p className="hero__lead">
            这是一座私人星系：随笔是余烬，笔记是冰卫星，书影音是借来的星光，文件是陨石带，留言是偶尔掠过的彗星。
            <br />
            把鼠标移到右边的星仪上，选一颗星降落。
          </p>
          <div className="hero__actions">
            <Knob to="/atlas" size="lg">走进星图</Knob>
            <Knob tone="dark" size="lg" onClick={drift}>随机漂流</Knob>
            <button type="button" className="text-action hero__search" onClick={palette.open}>
              或按 <kbd>/</kbd> 检索星空
            </button>
          </div>
          <DemoBadge />
        </div>
        <div className="hero__orrery">
          <Orrery stats={stats} />
        </div>
        <div className="hero__cue" aria-hidden="true"><span /></div>
      </section>

      <div className="home-body">
        <Oracle />
        {corpusFailed ? (
          <section className="home-sec" aria-label="随笔、笔记与书影音">
            <ErrorState onRetry={c.retry} />
          </section>
        ) : (
          <>
            <EssayStrip corpus={corpus} />
            <div className="home-split">
              <NoteLedger corpus={corpus} />
              <ShelfStrip corpus={corpus} />
            </div>
          </>
        )}
        <CometTicker messages={guests?.items ?? null} failed={guestsFailed} onRetry={retryGuests} />
        {!corpusFailed && <Scale corpus={corpus} guests={guests?.total} />}
      </div>
    </main>
  );
}
