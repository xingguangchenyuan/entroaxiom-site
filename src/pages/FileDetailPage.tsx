import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFile } from '../content/loader';
import type { FileItem } from '../content/types';
import { copy } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { DemoBadge } from '../components/list/DemoBadge';
import { formatBytes, kindLabel } from '../lib/format';

interface Props {
  file: FileItem;
}

/** 可预览文件的展示区（设计文档 §8 文件详情） */
function FilePreview({ file }: Props) {
  if (!file.src) return null;

  if (file.kind === 'image') {
    return (
      <figure className="file-preview">
        <img
          className="file-preview-image"
          src={file.src}
          alt={file.name}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget.parentElement as HTMLElement).dataset.broken = 'true';
          }}
        />
      </figure>
    );
  }

  if (file.kind === 'pdf') {
    return (
      <div className="file-preview">
        <object className="file-preview-pdf" data={file.src} type="application/pdf">
          <p className="file-preview-fallback">{copy.pdfUnsupported}</p>
        </object>
      </div>
    );
  }

  return null;
}

export function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [file, setFile] = useState<FileItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    if (!id) {
      setReady(true);
      return;
    }
    getFile(id).then((f) => {
      if (!alive) return;
      setFile(f ?? null);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useDocumentTitle(file?.name);

  if (!ready || file === null) {
    return (
      <ContentPanel>
        {ready && (
          <div className="state-empty">
            <p className="state-text">{copy.contentMissing}</p>
            <Link className="state-action" to="/files">
              {copy.backToList}
            </Link>
          </div>
        )}
      </ContentPanel>
    );
  }

  const meta = [
    formatBytes(file.size),
    file.kind ? kindLabel(file.kind) : null,
    file.ext ? `${file.ext.toUpperCase()}` : null,
    file.updatedAt ? `更新于 ${file.updatedAt}` : null,
  ].filter(Boolean);

  return (
    <ContentPanel>
      <div className="file-detail">
        <header className="file-detail-header">
          <Link className="reading-back-link" to="/files">
            ← {copy.backToList}
          </Link>
          <DemoBadge />
          <h1 className="file-detail-name">{file.name}</h1>
          {meta.length > 0 && <p className="file-detail-meta">{meta.join(' · ')}</p>}
          {file.description && <p className="file-detail-desc">{file.description}</p>}
        </header>

        <div className="file-detail-body">
          <FilePreview file={file} />
          {(file.src && (file.kind === 'image' || file.kind === 'pdf')) === false && (
            <p className="file-detail-note">{copy.previewUnsupported}</p>
          )}
          {file.src && (
            <div className="file-detail-actions">
              <a className="btn-download" href={file.src} download={file.name}>
                {copy.download}
              </a>
            </div>
          )}
        </div>
      </div>
    </ContentPanel>
  );
}