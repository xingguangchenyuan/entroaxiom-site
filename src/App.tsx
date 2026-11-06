import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SkyCanvas } from './components/sky/SkyCanvas';
import { setSkyMode, setSkyTint } from './components/sky/skyStore';
import { WelcomeOverlay } from './components/welcome/WelcomeOverlay';
import { SkipLink } from './components/layout/SkipLink';
import { TopNav } from './components/layout/TopNav';
import { OrbitDock } from './components/layout/OrbitDock';
import { Footer } from './components/layout/Footer';
import { PaletteProvider } from './components/layout/CommandPalette';
import { ErrorBoundary } from './components/state/ErrorBoundary';
import { useScrollRestore } from './hooks/useScrollRestore';
import { useRouteFocus } from './hooks/useRouteFocus';
import { useSessionEntered } from './hooks/useSessionEntered';
import { installPointerLight } from './lib/pointerLight';
import { ROUTES, prefetchRoute } from './lib/routePrefetch';
import { worldForPath } from './config/worlds';
import { canonicalUrl, normalizeSiteUrl } from './lib/siteUrl';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * 首页与 404 常驻入口（首屏必须立刻有内容），其余页面按块异步加载。
 * 详情页会连带拉进 markdown + katex，首屏用不上，没必要为它先付流量。
 */
const EssaysPage = lazy(ROUTES.essays);
const EssayDetailPage = lazy(ROUTES.essay);
const NotesPage = lazy(ROUTES.notes);
const NoteDetailPage = lazy(ROUTES.note);
const ShelfPage = lazy(ROUTES.shelf);
const FilesPage = lazy(ROUTES.files);
const FileDetailPage = lazy(ROUTES.file);
const GuestbookPage = lazy(ROUTES.guestbook);
const AtlasPage = lazy(ROUTES.atlas);
const AxiomsPage = lazy(ROUTES.axioms);

/** 非模块页面的天空色调 */
const PAGE_TINT: Record<string, [number, number, number]> = {
  '/atlas': [0.2, 0.08, 0.16],
  '/axioms': [0.18, 0.12, 0.04],
};

/** 分块加载期间的占位：沿用列表页已有的骨架样式，高度不跳动 */
function RouteFallback() {
  return (
    <div className="page" aria-busy="true">
      <div className="skeleton">
        <div className="skeleton__row" />
        <div className="skeleton__row" />
        <div className="skeleton__row" />
      </div>
    </div>
  );
}

/**
 * 应用骨架：天空层（常驻 WebGL 黑洞 + 随模块变色的星云）→ 欢迎层（本会话首次访问）→ 舞台（导航 + 路由 + 页脚）。
 * 欢迎层显示期间，舞台整体 inert（不可聚焦、读屏忽略）；点「进入视界」后舞台立刻在欢迎层底下浮现，
 * 欢迎层以幽灵态继续淡出 0.95s —— 交叉溶解，而不是先消失再跳变。
 * 管理后台已拆出为独立的开源 Admin 项目，本站只读公开接口 + 留言投递（见 docs/API.md）。
 */
function Shell() {
  const { pathname } = useLocation();
  const { entered, enter } = useSessionEntered();
  // fading：欢迎层正在淡出（首页已在它底下浮现）。stageHidden：舞台是否还藏着
  const [fading, setFading] = useState(false);
  const showWelcome = !entered || fading;
  const stageHidden = !entered;
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollRestore();
  // 换页后把焦点交给新页面的 <main>（欢迎层显示期间不处理）
  useRouteFocus(!stageHidden);

  useEffect(() => installPointerLight(), []);

  // 悬停或键盘聚焦站内链接时预取目标分块：真正点下去时通常已经就绪
  useEffect(() => {
    const onNear = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/"]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href');
      if (href) prefetchRoute(href);
    };
    document.addEventListener('pointerover', onNear, { passive: true });
    document.addEventListener('focusin', onNear);
    return () => {
      document.removeEventListener('pointerover', onNear);
      document.removeEventListener('focusin', onNear);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current as (HTMLDivElement & { inert?: boolean }) | null;
    if (el) el.inert = stageHidden;
  }, [stageHidden]);

  const view = stageHidden ? 'welcome' : pathname === '/' ? 'home' : 'content';
  useEffect(() => {
    document.body.dataset.view = view;
    setSkyMode(view === 'welcome' ? 'welcome' : view === 'home' ? 'home' : 'calm');
  }, [view]);

  useEffect(() => {
    const w = worldForPath(pathname);
    const top = '/' + (pathname.split('/')[1] ?? '');
    setSkyTint(w?.tint ?? PAGE_TINT[top]);
    document.body.dataset.world = w?.key ?? (top.slice(1) || 'home');
  }, [pathname]);

  useEffect(() => {
    // 这是 SPA：让客户端导航后的 canonical / og:url 跟随当前路径，
    // 不把所有文章详情页都错误地 canonical 到首页。查询参数/hash 不属于 canonical URL。
    // 域名优先用构建时配置的 VITE_SITE_URL（和 og:image 同源），没配置才回退到当前访问的 origin
    const origin = normalizeSiteUrl(import.meta.env.VITE_SITE_URL) ?? window.location.origin;
    const url = canonicalUrl(origin, pathname);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = url;
  }, [pathname]);

  return (
    <>
      <SkipLink />
      <SkyCanvas />
      {showWelcome && (
        <WelcomeOverlay
          onEnter={() => {
            // 进入瞬间就让舞台浮现：欢迎层以幽灵态继续淡出 0.95s，交叉溶解
            setFading(true);
            enter();
          }}
          onExited={() => setFading(false)}
        />
      )}
      <div
        className={`stage${stageHidden ? ' is-hidden' : fading ? ' is-revealing' : ''}`}
        ref={stageRef}
        aria-hidden={stageHidden || undefined}
      >
        <TopNav />
        <ErrorBoundary>
          <div className="route" key={pathname}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/essays" element={<EssaysPage />} />
                <Route path="/essays/:id" element={<EssayDetailPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/notes/:id" element={<NoteDetailPage />} />
                <Route path="/shelf" element={<ShelfPage />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/files/:id" element={<FileDetailPage />} />
                <Route path="/guestbook" element={<GuestbookPage />} />
                <Route path="/atlas" element={<AtlasPage />} />
                <Route path="/axioms" element={<AxiomsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
        <Footer />
        <OrbitDock />
      </div>
    </>
  );
}

export default function App() {
  return (
    <PaletteProvider>
      <Shell />
    </PaletteProvider>
  );
}
