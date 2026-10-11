import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getNote } from '../content/loader';
import type { Note } from '../content/types';
import { copy } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ContentPanel } from '../components/layout/ContentPanel';
import { Markdown, type Heading } from '../components/reading/Markdown';
import { Toc } from '../components/reading/Toc';
import { DemoBadge } from '../components/list/DemoBadge';

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [ready, setReady] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setHeadings([]);
    if (!id) {
      setReady(true);
      return;
    }
    getNote(id).then((n) => {
      if (!alive) return;
      setNote(n ?? null);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useDocumentTitle(note?.title);

  if (!ready || note === null) {
    return (
      <ContentPanel>
        {ready && (
          <div className="state-empty">
            <p className="state-text">{copy.contentMissing}</p>
            <Link className="state-action" to="/notes">
              {copy.backToList}
            </Link>
          </div>
        )}
      </ContentPanel>
    );
  }

  return (
    <ContentPanel>
      <div className="reading-layout">
        <article className="reading-main">
          <header className="reading-page-header">
            <Link className="reading-back-link" to="/notes">
              ← {copy.backToList}
            </Link>
            <DemoBadge />
            <h1 className="reading-title">{note.title}</h1>
            {(note.category || note.date || note.updated) && (
              <p className="reading-meta">
                {note.category && <span className="reading-meta-item">{note.category}</span>}
                {note.date && <time>{note.date}</time>}
                {note.updated && note.updated !== note.date && <time>更新于 {note.updated}</time>}
                {note.tags?.map((tag) => (
                  <span key={tag} className="reading-tag">
                    {tag}
                  </span>
                ))}
              </p>
            )}
          </header>
          <Markdown body={note.body} onHeadings={setHeadings} />
        </article>
        <Toc headings={headings} />
      </div>
    </ContentPanel>
  );
}