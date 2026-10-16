import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Knob } from '../components/ui/Knob';
import { Segmented } from '../components/ui/Segmented';
import { IconLogout } from '../components/ui/Icons';
import { ToastProvider, useToast } from '../admin/Toast';
import { Overview, type Tab } from '../admin/Overview';
import { ContentManager } from '../admin/ContentManager';
import { ContentEditor } from '../admin/ContentEditor';
import { FilesManager } from '../admin/FilesManager';
import { ConfirmDialog } from '../admin/ConfirmDialog';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: '概览' },
  { value: 'notes', label: '笔记' },
  { value: 'summaries', label: '总结' },
  { value: 'files', label: '文件' },
];

function ConsoleInner() {
  const { status, check, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: Tab = rawTab === 'notes' || rawTab === 'summaries' || rawTab === 'files' ? rawTab : 'overview';
  const edit = params.get('edit');
  const creating = params.get('create') === '1';
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const doLogout = async () => {
    setConfirmLogout(false);
    try {
      await logout();
      navigate('/owner', { replace: true });
    } catch {
      toast.push('退出失败，请稍后再试', 'error');
    }
  };

  // 控制台自己再确认一次（防止用过期的“站长提示”进来）
  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (t: Tab, e?: string | null, create = false) => {
    const sp = new URLSearchParams();
    if (t !== 'overview') sp.set('tab', t);
    if (create) sp.set('create', '1');
    else if (e) sp.set('edit', e);
    const s = sp.toString();
    navigate(s ? `/console?${s}` : '/console');
  };

  if (status === 'anon') return <Navigate to="/owner" replace />;
  if (status !== 'owner') {
    return (
      <main id="main" className="page" tabIndex={-1} aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--stage" />
      </main>
    );
  }

  const editing = (tab === 'notes' || tab === 'summaries') && (creating || edit !== null);

  return (
    <main id="main" className="page console" tabIndex={-1}>
      <header className="console__head">
        <div>
          <h1 className="page__title display">控制台</h1>
          <p className="page__lead">只有你能看到这里。新建的内容默认私密，公开前访客看不到。</p>
        </div>
        <div className="console__head-actions">
          <Knob to="/" tone="dark" size="sm">查看站点</Knob>
          <Knob
            tone="dark"
            size="sm"
            onClick={() => { if (hasChanges) setConfirmLogout(true); else void doLogout(); }}
          >
            <IconLogout size={15} /> 退出
          </Knob>
        </div>
      </header>

      <div className="console__tabs">
        <Segmented<Tab> label="控制台分区" value={tab} onChange={(t) => go(t)} options={TABS} />
      </div>

      {tab === 'overview' && <Overview go={go} />}
      {(tab === 'notes' || tab === 'summaries') &&
        (editing ? (
          <ContentEditor key={`${tab}:${creating ? 'create' : `edit:${edit}`}`} module={tab} id={creating ? null : edit} onClose={() => go(tab)} onSaved={(id) => (creating || id !== edit) && go(tab, id)} onDirtyChange={setHasChanges} />
        ) : (
          <ContentManager module={tab} onEdit={(id) => go(tab, id)} onCreate={() => go(tab, undefined, true)} />
        ))}
      {tab === 'files' && <FilesManager />}
      {confirmLogout && (
        <ConfirmDialog title="放弃修改并退出登录？" confirmLabel="放弃并退出" danger onConfirm={() => void doLogout()} onCancel={() => setConfirmLogout(false)}>
          <p>还有未保存的内容，退出后不会保留。</p>
        </ConfirmDialog>
      )}
    </main>
  );
}

export function ConsolePage() {
  useDocumentTitle('控制台');
  return (
    <ToastProvider>
      <ConsoleInner />
    </ToastProvider>
  );
}
