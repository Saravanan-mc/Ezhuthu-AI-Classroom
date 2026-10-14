import React, { useState, useEffect, useRef } from 'react';
import { TextBlock } from '../../types/ink';
import { Trash2, GripVertical, Check, Type, Minus, Plus } from 'lucide-react';

interface EditableTextBlockProps {
  block: TextBlock;
  isEditing: boolean;
  onStartEditing: () => void;
  onSave: (updated: TextBlock) => void;
  onDelete: (id: string) => void;
}

export const EditableTextBlock: React.FC<EditableTextBlockProps> = ({
  block,
  isEditing,
  onStartEditing,
  onSave,
  onDelete,
}) => {
  const [draftText, setDraftText] = useState(block.text);
  const [fontSize, setFontSize] = useState(block.fontSize || 16);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: block.x, y: block.y });
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraftText(block.text);
    setFontSize(block.fontSize || 16);
    setPos({ x: block.x, y: block.y });
  }, [block]);

  // Auto-focus and resize textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
    }
  }, [isEditing]);

  const handleCommit = () => {
    onSave({
      ...block,
      text: draftText,
      fontSize,
      x: pos.x,
      y: pos.y,
    });
  };

  const handleDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPos({
      x: Math.max(0, dragStartRef.current.startX + dx),
      y: Math.max(0, dragStartRef.current.startY + dy),
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    onSave({
      ...block,
      text: draftText,
      x: pos.x,
      y: pos.y,
      fontSize,
    });
  };

  const adjustFontSize = (delta: number) => {
    const next = Math.max(12, Math.min(48, fontSize + delta));
    setFontSize(next);
    onSave({
      ...block,
      text: draftText,
      fontSize: next,
      x: pos.x,
      y: pos.y,
    });
  };

  return (
    <div
      className={`text-block-wrapper ${isEditing ? 'active-editing' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) onStartEditing();
      }}
      style={{
        position: 'absolute',
        top: pos.y,
        left: pos.x,
        zIndex: 25,
        minWidth: 140,
        maxWidth: 600,
        borderRadius: 8,
        background: isEditing ? '#ffffff' : 'rgba(255, 255, 255, 0.94)',
        border: isEditing ? '2px solid var(--accent-primary)' : '1px dashed rgba(0, 0, 0, 0.18)',
        boxShadow: isEditing
          ? '0 6px 20px rgba(37, 99, 235, 0.15), 0 2px 6px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        cursor: isEditing ? 'default' : 'text',
        userSelect: isEditing ? 'text' : 'none',
        transition: isDragging ? 'none' : 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Top Controls Toolbar when Editing or Hovering */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isEditing ? '1px solid var(--border-color)' : 'none',
          paddingBottom: isEditing ? 4 : 0,
          gap: 6,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            color: 'var(--text-tertiary)',
            padding: '2px 4px',
            borderRadius: 4,
          }}
          title="Drag to move text block"
        >
          <GripVertical size={14} />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>
            Text Note
          </span>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Font Size Adjusters */}
          {isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 4 }}>
              <button
                className="btn-icon"
                style={{ width: 20, height: 20, padding: 0 }}
                onClick={() => adjustFontSize(-2)}
                title="Decrease font size"
              >
                <Minus size={11} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
                {fontSize}
              </span>
              <button
                className="btn-icon"
                style={{ width: 20, height: 20, padding: 0 }}
                onClick={() => adjustFontSize(2)}
                title="Increase font size"
              >
                <Plus size={11} />
              </button>
            </div>
          )}

          {isEditing && (
            <button
              className="btn-icon"
              style={{ width: 22, height: 22, padding: 0, color: '#10b981' }}
              onClick={handleCommit}
              title="Done typing (Ctrl+Enter / Click outside)"
            >
              <Check size={13} />
            </button>
          )}

          <button
            className="btn-icon"
            style={{ width: 22, height: 22, padding: 0, color: '#ef4444', opacity: 0.7 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            title="Delete text block"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draftText}
          placeholder="Type your notes, thoughts, or math here..."
          onChange={(e) => {
            setDraftText(e.target.value);
            // Auto resize
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.max(40, e.target.scrollHeight)}px`;
          }}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleCommit();
            } else if (e.key === 'Escape') {
              handleCommit();
            }
          }}
          style={{
            width: '100%',
            minHeight: 40,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: block.color || 'var(--text-primary)',
            fontSize: `${fontSize}px`,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            resize: 'none',
            padding: 2,
            margin: 0,
          }}
        />
      ) : (
        <div
          style={{
            fontSize: `${fontSize}px`,
            color: block.color || 'var(--text-primary)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: 24,
            padding: 2,
          }}
          title="Click to edit and type"
        >
          {draftText.trim() ? (
            draftText
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: 13 }}>
              Click to type note...
            </span>
          )}
        </div>
      )}
    </div>
  );
};
