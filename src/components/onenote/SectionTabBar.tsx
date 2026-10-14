import React, { useState } from 'react';
import { NotebookSection } from '../../types/notebook';
import { Plus, MoreVertical, Edit2, Trash2, Palette, Check, X } from 'lucide-react';

interface SectionTabBarProps {
  sections: NotebookSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (title: string, color: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onChangeSectionColor: (sectionId: string, newColor: string) => void;
  onDeleteSection: (sectionId: string) => void;
}

export const ONENOTE_TAB_COLORS = [
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#6366f1', // Indigo
  '#3b82f6', // Cobalt Blue
  '#0284c7', // Sky Blue
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#10b981', // Emerald
  '#059669', // Dark Emerald
  '#22c55e', // Green
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ea580c', // Tangerine
  '#ef4444', // Red
  '#dc2626', // Crimson
  '#b91c1c', // Ruby
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#d946ef', // Fuchsia
  '#475569', // Slate
  '#334155', // Charcoal
  '#78350f', // Warm Brown
];

export const SectionTabBar: React.FC<SectionTabBarProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onRenameSection,
  onChangeSectionColor,
  onDeleteSection,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const handleStartRename = (section: NotebookSection) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (sectionId: string) => {
    if (editTitle.trim()) {
      onRenameSection(sectionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCreateSection = () => {
    const nextColor = ONENOTE_TAB_COLORS[sections.length % ONENOTE_TAB_COLORS.length];
    const nextNum = sections.length + 1;
    onAddSection(`Section ${nextNum}`, nextColor);
  };

  const handleDeleteWithConfirm = (section: NotebookSection) => {
    if (sections.length <= 1) {
      if (window.confirm(`Delete section "${section.title}"? A new empty section will be created.`)) {
        onDeleteSection(section.id);
      }
      return;
    }
    if (window.confirm(`Delete section "${section.title}" and its pages?`)) {
      onDeleteSection(section.id);
    }
  };

  return (
    <div
      className="onenote-section-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 12px 0 12px',
        gap: 6,
        overflowX: 'auto',
        userSelect: 'none',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          const isEditing = editingId === section.id;

          return (
            <div
              key={section.id}
              onClick={() => !isEditing && onSelectSection(section.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: '8px 8px 0 0',
                background: isActive ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderTop: `3px solid ${section.color}`,
                borderLeft: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: isActive ? '1px solid var(--bg-primary)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 -2px 6px rgba(0,0,0,0.04)' : 'none',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isEditing) handleStartRename(section);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpenId(section.id);
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: section.color,
                  flexShrink: 0,
                }}
              />

              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSaveRename(section.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(section.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      padding: '2px 6px',
                      fontSize: 12,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1.5px solid var(--accent-primary)',
                      borderRadius: 4,
                      outline: 'none',
                      width: 120,
                    }}
                  />
                  <button
                    className="btn-icon"
                    style={{ width: 20, height: 20, color: '#10b981' }}
                    onClick={() => handleSaveRename(section.id)}
                    title="Save name"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: 20, height: 20, color: 'var(--text-secondary)' }}
                    onClick={() => setEditingId(null)}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{ cursor: 'pointer' }}
                    title="Click or double-click to rename section"
                  >
                    {section.title}
                  </span>
                  {isActive && (
                    <button
                      className="btn-icon"
                      style={{ width: 18, height: 18, padding: 0, opacity: 0.7 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(section);
                      }}
                      title="Rename section"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              )}

              {/* Direct Delete Section (X) Button */}
              <button
                className="btn-icon"
                style={{
                  width: 18,
                  height: 18,
                  padding: 0,
                  opacity: isActive ? 0.7 : 0.35,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s ease',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWithConfirm(section);
                }}
                title="Delete Section"
              >
                <X size={12} color="#ef4444" />
              </button>

              {/* Options menu trigger */}
              <button
                className="btn-icon"
                style={{
                  width: 18,
                  height: 18,
                  opacity: isActive ? 0.8 : 0.4,
                  padding: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === section.id ? null : section.id);
                }}
                title="Section Options"
              >
                <MoreVertical size={12} />
              </button>

              {/* Section dropdown menu */}
              {menuOpenId === section.id && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 50,
                    minWidth: 160,
                    padding: '6px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => handleStartRename(section)}
                  >
                    <Edit2 size={13} /> Rename Section
                  </button>

                  <button
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      setColorPickerId(colorPickerId === section.id ? null : section.id);
                      setMenuOpenId(null);
                    }}
                  >
                    <Palette size={13} /> Tab Color
                  </button>

                  <button
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      setMenuOpenId(null);
                      handleDeleteWithConfirm(section);
                    }}
                  >
                    <Trash2 size={13} /> Delete Section
                  </button>
                </div>
              )}

              {/* Color picker popup with 24 colors */}
              {colorPickerId === section.id && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 50,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 5 }}>
                    {ONENOTE_TAB_COLORS.map((c) => (
                      <button
                        key={c}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: c,
                          border: section.color === c ? '2px solid white' : 'none',
                          cursor: 'pointer',
                          outline: section.color === c ? '2px solid var(--accent-primary)' : 'none',
                        }}
                        onClick={() => {
                          onChangeSectionColor(section.id, c);
                          setColorPickerId(null);
                        }}
                      />
                    ))}
                  </div>

                  {/* Custom color input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Custom:</span>
                    <input
                      type="color"
                      value={section.color}
                      onChange={(e) => onChangeSectionColor(section.id, e.target.value)}
                      style={{ width: 26, height: 22, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <button
                      className="btn-pill"
                      style={{ padding: '2px 6px', fontSize: 10 }}
                      onClick={() => setColorPickerId(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section Button */}
        <button
          onClick={handleCreateSection}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: '6px 6px 0 0',
            background: 'transparent',
            border: '1px dashed var(--border-color)',
            borderBottom: 'none',
            color: 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Add New Section"
        >
          <Plus size={14} /> Section
        </button>
      </div>
    </div>
  );
};
