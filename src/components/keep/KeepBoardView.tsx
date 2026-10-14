import React, { useState } from 'react';
import { KeepNote } from '../../types/ink';
import {
  Pin,
  CheckSquare,
  Plus,
  Trash2,
  Tag,
  Palette,
  Check,
  Search,
  FileText,
  X,
} from 'lucide-react';

interface KeepBoardViewProps {
  notes: KeepNote[];
  onAddNote: (note: Omit<KeepNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (note: KeepNote) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenCanvasNote?: (noteId: string) => void;
}

export const KEEP_COLORS = [
  { name: 'Default', bg: 'var(--bg-primary)', border: 'var(--border-color)' },
  { name: 'Coral', bg: '#fee2e2', border: '#fca5a5' },
  { name: 'Peach', bg: '#ffedd5', border: '#fdba74' },
  { name: 'Sand', bg: '#fef3c7', border: '#fcd34d' },
  { name: 'Mint', bg: '#dcfce7', border: '#86efac' },
  { name: 'Sage', bg: '#ccfbf1', border: '#5eead4' },
  { name: 'Fog', bg: '#e0f2fe', border: '#7dd3fc' },
  { name: 'Storm', bg: '#e0e7ff', border: '#a5b4fc' },
  { name: 'Dusk', bg: '#f3e8ff', border: '#d8b4fe' },
  { name: 'Blossom', bg: '#fce7f3', border: '#f9a8d4' },
];

export const KeepBoardView: React.FC<KeepBoardViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  // Quick Note Composer State
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(KEEP_COLORS[0].bg);
  const [isPinned, setIsPinned] = useState(false);
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newCheckItemText, setNewCheckItemText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Active color picker on existing card
  const [cardColorPickerId, setCardColorPickerId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Add checklist item in composer
  const handleAddChecklistItem = () => {
    if (newCheckItemText.trim()) {
      setChecklistItems((prev) => [
        ...prev,
        { id: 'chk_' + Date.now() + Math.random(), text: newCheckItemText.trim(), completed: false },
      ]);
      setNewCheckItemText('');
    }
  };

  // Add tag in composer
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      setTagInput('');
    }
  };

  // Submit new note
  const handleSaveNote = () => {
    if (!title.trim() && !content.trim() && checklistItems.length === 0) {
      setIsExpanded(false);
      return;
    }

    onAddNote({
      title: title.trim(),
      content: content.trim(),
      color: selectedColor,
      isPinned,
      tags,
      checklists: checklistItems,
    });

    // Reset composer
    setTitle('');
    setContent('');
    setSelectedColor(KEEP_COLORS[0].bg);
    setIsPinned(false);
    setIsChecklistMode(false);
    setChecklistItems([]);
    setTags([]);
    setIsExpanded(false);
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.checklists?.some((c) => c.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTagFilter === 'all' || (n.tags && n.tags.includes(selectedTagFilter));
    return matchesSearch && matchesTag;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  // Render Note Card
  const renderNoteCard = (note: KeepNote) => {
    return (
      <div
        key={note.id}
        className="keep-card"
        style={{
          background: note.color || 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.18s ease',
          breakInside: 'avoid',
          marginBottom: 16,
          color: '#1e293b',
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              wordBreak: 'break-word',
            }}
          >
            {note.title || 'Untitled'}
          </h3>

          <button
            className="btn-icon"
            style={{ width: 26, height: 26, padding: 0 }}
            onClick={() => onUpdateNote({ ...note, isPinned: !note.isPinned })}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin
              size={14}
              color={note.isPinned ? '#2563eb' : '#64748b'}
              style={{ fill: note.isPinned ? '#2563eb' : 'none' }}
            />
          </button>
        </div>

        {/* Note Body or Checklist */}
        {note.checklists && note.checklists.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {note.checklists.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const updatedChecklists = note.checklists?.map((c) =>
                    c.id === item.id ? { ...c, completed: !c.completed } : c
                  );
                  onUpdateNote({ ...note, checklists: updatedChecklists });
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: item.completed ? 'none' : '1.5px solid #64748b',
                    background: item.completed ? '#2563eb' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.completed && <Check size={11} color="white" />}
                </div>
                <span
                  style={{
                    textDecoration: item.completed ? 'line-through' : 'none',
                    color: item.completed ? '#94a3b8' : '#334155',
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: '#334155',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {note.content}
          </p>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {note.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  background: 'rgba(0,0,0,0.06)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              style={{ width: 24, height: 24, padding: 0 }}
              onClick={() => setCardColorPickerId(cardColorPickerId === note.id ? null : note.id)}
              title="Change note color"
            >
              <Palette size={13} color="#64748b" />
            </button>

            {/* Card Color Picker Dropdown */}
            {cardColorPickerId === note.id && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  zIndex: 30,
                  padding: 6,
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 20px)',
                  gap: 4,
                  boxShadow: 'var(--shadow-md)',
                  background: 'white',
                }}
              >
                {KEEP_COLORS.map((col) => (
                  <button
                    key={col.name}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: col.bg,
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onUpdateNote({ ...note, color: col.bg });
                      setCardColorPickerId(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-icon"
            style={{ width: 24, height: 24, padding: 0 }}
            onClick={() => onDeleteNote(note.id)}
            title="Delete note"
          >
            <Trash2 size={13} color="#ef4444" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="keep-board-container"
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-secondary)',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Top Search & Tag Filter Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-full)',
            padding: '10px 18px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search notes, checklists, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--text-primary)',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button className="btn-icon" onClick={() => setSearchQuery('')} style={{ width: 20, height: 20 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tag Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setSelectedTagFilter('all')}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: selectedTagFilter === 'all' ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: selectedTagFilter === 'all' ? 'white' : 'var(--text-secondary)',
            }}
          >
            # All Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: selectedTagFilter === tag ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: selectedTagFilter === tag ? 'white' : 'var(--text-secondary)',
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Quick "Take a note..." Composer */}
      <div
        className="keep-composer"
        style={{
          width: '100%',
          maxWidth: 600,
          background: selectedColor,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
          padding: isExpanded ? '16px' : '10px 18px',
          marginBottom: 32,
          transition: 'all 0.2s ease',
        }}
      >
        {!isExpanded ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'text',
              color: '#64748b',
            }}
            onClick={() => setIsExpanded(true)}
          >
            <span style={{ fontSize: 14, fontWeight: 500 }}>Take a note...</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="btn-icon"
                title="New checklist"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChecklistMode(true);
                  setIsExpanded(true);
                }}
              >
                <CheckSquare size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Title & Pin */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#0f172a',
                  width: '90%',
                }}
              />
              <button
                className="btn-icon"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin
                  size={15}
                  color={isPinned ? '#2563eb' : '#64748b'}
                  style={{ fill: isPinned ? '#2563eb' : 'none' }}
                />
              </button>
            </div>

            {/* Note Content or Checklists */}
            {isChecklistMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklistItems.map((chk, idx) => (
                  <div key={chk.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckSquare size={14} color="#64748b" />
                    <input
                      type="text"
                      value={chk.text}
                      onChange={(e) => {
                        const updated = [...checklistItems];
                        updated[idx].text = e.target.value;
                        setChecklistItems(updated);
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: '#334155',
                      }}
                    />
                    <button
                      className="btn-icon"
                      onClick={() => setChecklistItems(checklistItems.filter((c) => c.id !== chk.id))}
                      style={{ width: 18, height: 18 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* Add new check item */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={14} color="#64748b" />
                  <input
                    type="text"
                    placeholder="List item..."
                    value={newCheckItemText}
                    onChange={(e) => setNewCheckItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 13,
                      color: '#334155',
                    }}
                  />
                  <button className="btn-pill btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={handleAddChecklistItem}>
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                placeholder="Take a note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                style={{
                  fontSize: 14,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#334155',
                  resize: 'none',
                  width: '100%',
                }}
              />
            )}

            {/* Tags preview and adder */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    background: 'rgba(0,0,0,0.08)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  #{t}
                  <button
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={12} color="#64748b" />
                <input
                  type="text"
                  placeholder="Add tag (e.g. math)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  style={{
                    fontSize: 11,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: 120,
                  }}
                />
              </div>
            </div>

            {/* Color Palette & Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {KEEP_COLORS.map((col) => (
                  <button
                    key={col.name}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: col.bg,
                      border: selectedColor === col.bg ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedColor(col.bg)}
                    title={col.name}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn-pill btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => setIsExpanded(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-pill btn-primary"
                  style={{ padding: '4px 14px', fontSize: 12 }}
                  onClick={handleSaveNote}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Notes */}
      <div style={{ width: '100%', maxWidth: 1100 }}>
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}
            >
              PINNED ({pinnedNotes.length})
            </h4>
            <div
              style={{
                columnCount: 3,
                columnGap: 16,
              }}
            >
              {pinnedNotes.map(renderNoteCard)}
            </div>
          </div>
        )}

        {/* Other Notes */}
        <div>
          {pinnedNotes.length > 0 && otherNotes.length > 0 && (
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}
            >
              OTHERS ({otherNotes.length})
            </h4>
          )}
          {otherNotes.length > 0 ? (
            <div
              style={{
                columnCount: 3,
                columnGap: 16,
              }}
            >
              {otherNotes.map(renderNoteCard)}
            </div>
          ) : pinnedNotes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-tertiary)',
              }}
            >
              <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 500 }}>No notes found</p>
              <p style={{ fontSize: 13 }}>Use the composer above to jot down a quick note or checklist!</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
