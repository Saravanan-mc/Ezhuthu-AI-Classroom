import React, { useState } from 'react';
import { Notebook } from '../../types/notebook';
import { X, Plus, Search, Book, Trash2, Calendar } from 'lucide-react';

interface NotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook;
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  isOpen,
  onClose,
  notebook,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter pages matching title or recognized text (Tamil/English search!)
  const filteredPages = notebook.pages.map((p, idx) => ({ page: p, index: idx })).filter(({ page }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (page.title || '').toLowerCase().includes(q);
    const textMatch = page.recognizedItems.some((rec) => rec.rawText.toLowerCase().includes(q));
    return titleMatch || textMatch;
  });

  return (
    <aside
      className="glass-panel"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 320,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-floating)',
        background: 'var(--bg-surface)',
        animation: 'slideRight 200ms ease-out',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Book size={18} color="var(--primary)" />
          <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            Notebook Pages
          </h3>
        </div>
        <button className="btn-icon" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Search across handwritten & recognized notes */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="text-input"
            style={{ paddingLeft: 32, fontSize: 13 }}
            placeholder="Search Tamil or English notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Pages List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredPages.map(({ page, index }) => {
          const isActive = index === activePageIndex;
          return (
            <div
              key={page.id}
              onClick={() => {
                onSelectPage(index);
                onClose();
              }}
              style={{
                padding: 12,
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                background: isActive ? 'var(--primary-light)' : 'var(--bg-surface)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'all 150ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  Page {index + 1}
                </span>

                {notebook.pages.length > 1 && (
                  <button
                    className="btn-icon"
                    style={{ width: 22, height: 22 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete Page ${index + 1}?`)) {
                        onDeletePage(index);
                      }
                    }}
                    title="Delete page"
                  >
                    <Trash2 size={13} color="#ef4444" />
                  </button>
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="tamil-text">
                {page.title || `Untitled Page ${index + 1}`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{page.strokes.length} strokes</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={11} /> {new Date(page.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Page Footer */}
      <div style={{ padding: 14, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-muted)' }}>
        <button
          className="btn-pill btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            onAddPage();
            onClose();
          }}
        >
          <Plus size={16} /> Add New Page
        </button>
      </div>
    </aside>
  );
};
