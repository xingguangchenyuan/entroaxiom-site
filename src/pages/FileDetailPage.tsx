import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFile } from '../content/loader';
import type { FileItem } from '../content/types';
import { copy } from '../config/site';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatBytes, kindLabel } from '../lib/format';
import { FileGlyph } from '../components/list/FileRow';
import { Lightbox } from '../components/reading/Lightbox';
import { DemoBadge } from '../components/list/DemoBadge';
import { ErrorState } from '../components/state/ErrorState';
import { NotFoundState } from '../components/state/NotFoundState';
import { Knob } from '../components/ui/Knob';
import { IconBack, IconDownload } from '../components/ui/Icons';

/** 可预览文件的展示区：图片（点击放大）、PDF（内嵌，不可用时回退） */
function FilePreview({ file }: { file: FileItem }) {
  const [zoom, setZoom] = useState(false);
  const [broken, setBroken] = useState(false);
  if (!file.src) return null;

  if (file.kind === 'image') {
    return broken ? (
      <p className="file-note">{copy.imageFailed}</p>
    ) : (
      <>
        <button type="button" className="file-preview file-preview--image" aria-label={copy.zoomAlt} onClick={() => setZoom(true)}>
          <img src={file.src} alt={file.name} onError={() => setBroken(true)} />
        </button>
        {zoom && <Lightbox src={file.src} alt={file.name} onClose={() => setZoom(false)} />}
      </>
    );
  }
  if (file.kind === 'pdf') {
    return (
      <div className="file-preview file-preview--pdf">
        <object data={file.src} type="application/pdf" aria-label={file.name}>
          <p className="file-note">{copy.pdfUnsupported}</p>
        </object>
      </div>
    );
  }
  return <p className="file-note">{copy.previewUnsupported}</p>;
}

export function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync<FileItem | undefined>(() => (id ? getFile(id) : Promise.resolve(undefined)), [id]);
  const file = state.status === 'ready' ? state.data : undefined;
  useDocumentTitle(file?.name);

  if (state.status === 'error') {
    return (
      <main id="main" className="page page--read" tabIndex={-1}>
        <ErrorState onRetry={state.retry} />
      </main>
    );
  }
  if (state.status === 'loading') {
    return (
      <main id="main" className="page page--read" tabIndex={-1} aria-busy="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--body" />
      </main>
    );
  }
  if (!file) {
    return (
      <main id="main" className="page page--read" tabIndex={-1}>
        <NotFoundState title={copy.contentMissing} desc={copy.contentMissingDesc} />
      </main>
    );
  }

  const rows: [string, string][] = [
    ['类型', `${kindLabel(file.kind)} · ${file.ext.toUpperCase()}`],
    ['大小', formatBytes(file.size)],
    ...(file.updatedAt ? ([['更新于', file.updatedAt]] as [string, string][]) : []),
  ];

  return (
    <main id="main" className="page page--read" tabIndex={-1}>
      <Link to="/files" className="text-action article__back">
        <IconBack size={15} /> {copy.backToList}
      </Link>
      <header className="file-head">
        <FileGlyph kind={file.kind} ext={file.ext} />
        <div>
          <h1 className="file-head__name">{file.name}</h1>
          {file.description && <p className="file-head__desc">{file.description}</p>}
          <DemoBadge />
        </div>
      </header>

      <div className="file-grid">
        <section className="file-stage glass glass--flat" aria-label="预览">
          <FilePreview file={file} />
        </section>
        <aside className="file-side glass glass--flat">
          <dl className="file-facts">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {file.src && (
            <a className="knob knob--block" href={file.src} download={file.name}>
              <span className="knob__cap"><IconDownload size={17} /> {copy.download}</span>
            </a>
          )}
          <Knob to="/files" tone="dark" size="sm" block>返回文件库</Knob>
        </aside>
      </div>
    </main>
  );
}
