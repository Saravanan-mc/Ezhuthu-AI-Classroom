import React, { useState } from 'react';
import { Page } from '../../types/notebook';
import { Plus, Search, Pin, Trash2, ChevronLeft, ChevronRight, FileText, CheckSquare, Copy, Edit2, Check } from 'lucide-react';

interface PageListSidebarProps {
  pages: Page[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onTogglePinPage: (index: number) => void;
  onDuplicatePage?: (index: number) => void;
  onRenamePage?: (index: number, newTitle: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const PageListSidebar: React.FC<PageListSidebarProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onTogglePinPage,
  onDuplicatePage,
  onRenamePage,
  isOpen,
  onToggleOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredPages = pages
    .map((page, originalIndex) => ({ page, originalIndex }))
    .filter(({ page }) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const titleMatch = page.title.toLowerCase().includes(query);
      const textMatch = page.textBlocks?.some((tb) => tb.text.toLowerCase().includes(query));
      const checklistMatch = page.checklists?.some((c) => c.text.toLowerCase().includes(query));
      return titleMatch || textMatch || checklistMatch;
    });

  // Sort pinned pages to the top
  const sortedPages = [...filteredPages].sort((a, b) => {
    const aPin = a.page.isPinned ? 1 : 0;
    const bPin = b.page.isPinned ? 1 : 0;
    return bPin - aPin;
  });

  const handleStartRename = (index: number, currentTitle: string) => {
    setEditingIndex(index);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (index: number) => {
    if (editTitle.trim() && onRenamePage) {
      onRenamePage(index, editTitle.trim());
    }
    setEditingIndex(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        title="Open Page List (OneNote Binder)"
        style={{
          position: 'absolute',
          top: 56,
          left: 12,
          zIndex: 30,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        <ChevronRight size={14} /> Pages ({pages.length})
      </button>
    );
  }

  return (
    <aside
      className="onenote-page-sidebar"
      style={{
        width: 250,
        height: '100%',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
          PAGES ({pages.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn-icon"
            onClick={onToggleOpen}
            title="Collapse Sidebar"
            style={{ width: 26, height: 26 }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Add Page Button */}
      <div style={{ padding: '8px 12px' }}>
        <button
          className="btn-primary"
          onClick={onAddPage}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 12px',
            fontSize: 12,
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
          }}
        >
          <Plus size={14} /> Add Page
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '0 12px 8px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
          }}
        >
          <Search size={13} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Page List items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {sortedPages.map(({ page, originalIndex }) => {
          const isActive = originalIndex === activePageIndex;
          const isEditing = editingIndex === originalIndex;
          const formattedDate = new Date(page.updatedAt || page.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={page.id}
              onClick={() => !isEditing && onSelectPage(originalIndex)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              className="page-item"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {page.checklists && page.checklists.length > 0 ? (
                    <CheckSquare size={13} color="var(--accent-primary)" />
                  ) : (
                    <FileText size={13} color={isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  )}

                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        autoFocus
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(originalIndex);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        style={{
                          fontSize: 12,
                          padding: '1px 4px',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: 3,
                          outline: 'none',
                          width: 120,
                        }}
                      />
                      <button
                        className="btn-icon"
                        style={{ width: 18, height: 18, padding: 0 }}
                        onClick={() => handleSaveRename(originalIndex)}
                      >
                        <Check size={11} />
                      </button>
                    </div>
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(originalIndex, page.title);
                      }}
                      title="Double-click to rename"
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {page.title || `Page ${originalIndex + 1}`}
                    </span>
                  )}

                  {page.isPinned && (
                    <Pin size={11} color="var(--accent-primary)" style={{ fill: 'var(--accent-primary)' }} />
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginTop: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{formattedDate}</span>
                  <span>•</span>
                  <span>{page.strokes.length} strokes</span>
                  {page.checklists && page.checklists.length > 0 && (
                    <span>• {page.checklists.length} to-dos</span>
                  )}
                </div>

                {/* Text snippet preview if available */}
                {page.textBlocks && page.textBlocks.length > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    "{page.textBlocks[0].text}"
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                {/* Pin button */}
                <button
                  className="btn-icon"
                  style={{ width: 22, height: 22, padding: 0 }}
                  onClick={() => onTogglePinPage(originalIndex)}
                  title={page.isPinned ? 'Unpin Page' : 'Pin Page'}
                >
                  <Pin
                    size={12}
                    color={page.isPinned ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
                    style={{ fill: page.isPinned ? 'var(--accent-primary)' : 'none' }}
                  />
                </button>

                {/* Duplicate Page button */}
                {onDuplicatePage && (
                  <button
                    className="btn-icon"
                    style={{ width: 22, height: 22, padding: 0 }}
                    onClick={() => onDuplicatePage(originalIndex)}
                    title="Duplicate Page"
                  >
                    <Copy size={12} color="var(--text-tertiary)" />
                  </button>
                )}

                {/* Delete button */}
                {pages.length > 1 && (
                  <button
                    className="btn-icon"
                    style={{ width: 22, height: 22, padding: 0 }}
                    onClick={() => onDeletePage(originalIndex)}
                    title="Delete Page"
                  >
                    <Trash2 size={12} color="var(--text-tertiary)" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
