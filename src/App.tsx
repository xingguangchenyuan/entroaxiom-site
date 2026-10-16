import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { SkyCanvas } from './components/sky/SkyCanvas';
import { setSkyMode } from './components/sky/skyStore';
import { WelcomeOverlay } from './components/welcome/WelcomeOverlay';
import { SkipLink } from './components/layout/SkipLink';
import { TopNav } from './components/layout/TopNav';
import { Footer } from './components/layout/Footer';
import { PaletteProvider } from './components/layout/CommandPalette';
import { ErrorBoundary } from './components/state/ErrorBoundary';
import { useScrollRestore } from './hooks/useScrollRestore';
import { useSessionEntered } from './hooks/useSessionEntered';
import { installPointerLight } from './lib/pointerLight';
import { HomePage } from './pages/HomePage';
import { NotesPage } from './pages/NotesPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { SummariesPage } from './pages/SummariesPage';
import { SummaryDetailPage } from './pages/SummaryDetailPage';
import { FilesPage } from './pages/FilesPage';
import { FileDetailPage } from './pages/FileDetailPage';
import { AtlasPage } from './pages/AtlasPage';
import { AxiomsPage } from './pages/AxiomsPage';
import { OwnerLoginPage } from './pages/OwnerLoginPage';
import { ConsolePage } from './pages/ConsolePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * 应用骨架：天空层（常驻）→ 欢迎层（本会话首次访问首页时）→ 舞台（导航 + 路由 + 页脚）。
 * 欢迎层显示期间，舞台整体 inert（不可聚焦、读屏忽略），避免焦点跑到看不见的页面里。
 */
function Shell() {
  const { pathname } = useLocation();
  const { entered, enter } = useSessionEntered();
  const showWelcome = !entered;
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollRestore();

  useEffect(() => installPointerLight(), []);

  useEffect(() => {
    const el = stageRef.current as (HTMLDivElement & { inert?: boolean }) | null;
    if (el) el.inert = showWelcome;
  }, [showWelcome]);

  const view = showWelcome ? 'welcome' : pathname === '/' ? 'home' : 'content';
  useEffect(() => {
    document.body.dataset.view = view;
    setSkyMode(view === 'welcome' ? 'welcome' : view === 'home' ? 'home' : 'calm');
  }, [view]);

  return (
    <>
      <SkipLink />
      <SkyCanvas />
      {showWelcome && <WelcomeOverlay onEnter={enter} />}
      <div className={`stage${showWelcome ? ' is-hidden' : ''}`} ref={stageRef} aria-hidden={showWelcome || undefined}>
        <TopNav />
        <ErrorBoundary>
          <div className="route" key={pathname}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/:id" element={<NoteDetailPage />} />
              <Route path="/summaries" element={<SummariesPage />} />
              <Route path="/summaries/:id" element={<SummaryDetailPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/files/:id" element={<FileDetailPage />} />
              <Route path="/atlas" element={<AtlasPage />} />
              <Route path="/axioms" element={<AxiomsPage />} />
              <Route path="/owner" element={<OwnerLoginPage />} />
              <Route path="/console" element={<ConsolePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </ErrorBoundary>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PaletteProvider>
        <Shell />
      </PaletteProvider>
    </AuthProvider>
  );
}
