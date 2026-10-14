import React, { useState, useEffect, useRef } from 'react';
import { Notebook, Page, NotebookSection } from '../../types/notebook';
import { KeepNote } from '../../types/ink';
import { Search, X, FileText, CheckSquare, Sparkles, Tag, Folder, Layers, ArrowRight } from 'lucide-react';

export interface SearchResultItem {
  id: string;
  type: 'page' | 'keep-note' | 'text-block' | 'checklist' | 'handwriting';
  title: string;
  snippet: string;
  sourceBreadcrumb: string;
  sectionId?: string;
  pageIndex?: number;
  keepNoteId?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook;
  onNavigateToPage: (sectionId: string, pageIndex: number) => void;
  onNavigateToKeepNote: (noteId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  notebook,
  onNavigateToPage,
  onNavigateToKeepNote,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Search logic across notebooks, sections, pages, handwriting, and keep notes
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const items: SearchResultItem[] = [];
    const sections: NotebookSection[] = notebook.sections || [];

    // 1. Search Sections & Pages
    sections.forEach((section) => {
      // Check section title
      if (section.title.toLowerCase().includes(q)) {
        items.push({
          id: `sec_${section.id}`,
          type: 'page',
          title: section.title,
          snippet: `Section with ${section.pages.length} pages`,
          sourceBreadcrumb: `${notebook.title} → ${section.title}`,
          sectionId: section.id,
          pageIndex: 0,
        });
      }

      // Check pages
      section.pages.forEach((page, pIdx) => {
        const pageTitle = page.title || `Page ${pIdx + 1}`;
        const titleMatch = pageTitle.toLowerCase().includes(q);

        if (titleMatch) {
          items.push({
            id: `page_${page.id}`,
            type: 'page',
            title: pageTitle,
            snippet: `Page created on ${new Date(page.createdAt).toLocaleDateString()}`,
            sourceBreadcrumb: `${notebook.title} → ${section.title} → ${pageTitle}`,
            sectionId: section.id,
            pageIndex: pIdx,
          });
        }

        // Check text blocks on page
        page.textBlocks?.forEach((tb) => {
          if (tb.text.toLowerCase().includes(q)) {
            items.push({
              id: `tb_${tb.id}`,
              type: 'text-block',
              title: pageTitle,
              snippet: tb.text,
              sourceBreadcrumb: `${notebook.title} → ${section.title} → ${pageTitle}`,
              sectionId: section.id,
              pageIndex: pIdx,
            });
          }
        });

        // Check checklists on page
        page.checklists?.forEach((chk) => {
          if (chk.text.toLowerCase().includes(q)) {
            items.push({
              id: `chk_${chk.id}`,
              type: 'checklist',
              title: pageTitle,
              snippet: `${chk.completed ? '☑' : '☐'} ${chk.text}`,
              sourceBreadcrumb: `${notebook.title} → ${section.title} → ${pageTitle}`,
              sectionId: section.id,
              pageIndex: pIdx,
            });
          }
        });

        // Check recognized handwriting
        page.recognizedItems?.forEach((rec) => {
          if (rec.rawText && rec.rawText.toLowerCase().includes(q)) {
            items.push({
              id: `rec_${rec.id}`,
              type: 'handwriting',
              title: pageTitle,
              snippet: `Handwriting: "${rec.rawText.trim()}"`,
              sourceBreadcrumb: `${notebook.title} → ${section.title} → ${pageTitle}`,
              sectionId: section.id,
              pageIndex: pIdx,
            });
          }
        });

        // Check tags on page
        page.tags?.forEach((t) => {
          if (t.toLowerCase().includes(q)) {
            items.push({
              id: `tag_${page.id}_${t}`,
              type: 'page',
              title: `#${t}`,
              snippet: `Tagged page: ${pageTitle}`,
              sourceBreadcrumb: `${notebook.title} → ${section.title} → ${pageTitle}`,
              sectionId: section.id,
              pageIndex: pIdx,
            });
          }
        });
      });
    });

    // 2. Search Google Keep Notes
    const keepNotes: KeepNote[] = notebook.keepNotes || [];
    keepNotes.forEach((note) => {
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      const checklistMatch = note.checklists?.some((c) => c.text.toLowerCase().includes(q));
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(q));

      if (titleMatch || contentMatch || checklistMatch || tagMatch) {
        let snippet = note.content;
        if (!snippet && note.checklists && note.checklists.length > 0) {
          snippet = note.checklists.map((c) => `${c.completed ? '☑' : '☐'} ${c.text}`).join(', ');
        }

        items.push({
          id: `keep_${note.id}`,
          type: 'keep-note',
          title: note.title || 'Untitled Keep Note',
          snippet: snippet || (note.tags?.length ? `Tags: #${note.tags.join(' #')}` : 'Quick note'),
          sourceBreadcrumb: `Google Keep Notes`,
          keepNoteId: note.id,
        });
      }
    });

    setResults(items);
  }, [query, notebook]);

  if (!isOpen) return null;

  const handleSelectResult = (item: SearchResultItem) => {
    if (item.keepNoteId) {
      onNavigateToKeepNote(item.keepNoteId);
    } else if (item.sectionId !== undefined && item.pageIndex !== undefined) {
      onNavigateToPage(item.sectionId, item.pageIndex);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 640,
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22)',
          background: 'var(--bg-primary)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Search size={18} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notebook, sections, pages, handwriting, keep notes, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {query && (
            <button className="btn-icon" onClick={() => setQuery('')} style={{ width: 22, height: 22 }}>
              <X size={14} />
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Type keywords to search across notebooks, sections, handwritten notes, text blocks, checklists, and Google Keep.
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No matching notes or handwriting found for "{query}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', padding: '4px 8px', letterSpacing: '0.04em' }}>
                RESULTS ({results.length})
              </div>
              {results.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleSelectResult(res)}
                  className="search-result-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      {res.type === 'keep-note' ? (
                        <Tag size={15} color="#f59e0b" />
                      ) : res.type === 'checklist' ? (
                        <CheckSquare size={15} color="#10b981" />
                      ) : res.type === 'handwriting' ? (
                        <Sparkles size={15} color="var(--accent-primary)" />
                      ) : (
                        <FileText size={15} color="#3b82f6" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {res.title}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {res.snippet}
                      </p>

                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                        {res.sourceBreadcrumb}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={14} color="var(--text-tertiary)" style={{ marginTop: 4 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
