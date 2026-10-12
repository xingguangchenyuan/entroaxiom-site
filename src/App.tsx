import { useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useScrollRestore } from './hooks/useScrollRestore';
import { useSessionEntered } from './hooks/useSessionEntered';
import { SkipLink } from './components/layout/SkipLink';
import { TopNav } from './components/layout/TopNav';
import { MobileMenu } from './components/layout/MobileMenu';
import { WelcomeOverlay } from './components/welcome/WelcomeOverlay';
import { ErrorBoundary } from './components/state/ErrorBoundary';
import { useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FilesPage } from './pages/FilesPage';
import { NotesPage } from './pages/NotesPage';
import { SummariesPage } from './pages/SummariesPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { SummaryDetailPage } from './pages/SummaryDetailPage';
import { FileDetailPage } from './pages/FileDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  const { entered, enter } = useSessionEntered();
  const [closing, setClosing] = useState(false);
  const [welcomeGone, setWelcomeGone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { pathname } = useLocation();
  const galaxyPage = pathname === '/' || ['/files', '/notes', '/summaries'].includes(pathname);
  const stageRef = useRef<HTMLDivElement>(null);
  useScrollRestore();

  const welcomeActive = !entered && !welcomeGone;

  // 欢迎层可见时给舞台加 inert，防止 Tab 聚焦到被覆盖的导航（设计文档 §6.1）
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (welcomeActive) {
      el.setAttribute('inert', '');
    } else {
      el.removeAttribute('inert');
    }
  }, [welcomeActive]);
  // 进入动画结束（或 reduced-motion 同步卸载）后把焦点移交到主内容区
  const handleClosed = () => {
    setWelcomeGone(true);
    requestAnimationFrame(() => {
      const main = document.getElementById('main');
      if (main instanceof HTMLElement) main.focus({ preventScroll: true });
    });
  };

  // reduced-motion 时 transitionend 可能不触发，同步卸载
  useEffect(() => {
    if (closing && reduced) handleClosed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing, reduced]);

  const onNavigate = () => setMenuOpen(false);

  return (
    <ErrorBoundary>
      <SkipLink />
      <div
        className={`app-stage${galaxyPage ? ' app-stage-galaxy' : ''}`}
        ref={stageRef}
        aria-hidden={welcomeActive || undefined}
      >
        <TopNav
          onNavigate={onNavigate}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
        />
        <MobileMenu open={menuOpen} onClose={onNavigate} />

        <div className={`shell${galaxyPage ? ' shell-galaxy' : ''}`}>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/files/:id" element={<FileDetailPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/summaries" element={<SummariesPage />} />
          <Route path="/summaries/:id" element={<SummaryDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </div>
      </div>

      {welcomeActive && (
        <WelcomeOverlay
          closing={closing}
          onEnter={() => {
            enter();
            setClosing(true);
          }}
          onClosed={handleClosed}
        />
      )}
    </ErrorBoundary>
  );
}