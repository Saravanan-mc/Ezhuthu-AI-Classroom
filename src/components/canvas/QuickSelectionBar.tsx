import React from 'react';
import { BoundingBox, Stroke } from '../../types/ink';
import { Sparkles, Calculator, Wand2, Copy, Trash2, Move, CheckSquare, X, CheckCheck, Play } from 'lucide-react';

interface QuickSelectionBarProps {
  bbox: BoundingBox;
  selectedStrokes: Stroke[];
  onConvertText: () => void;
  onConvertMath: () => void;
  onAutoCorrect: () => void;
  onCopyText: () => void;
  onDelete: () => void;
  onReplay?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const QuickSelectionBar: React.FC<QuickSelectionBarProps> = ({
  bbox,
  selectedStrokes,
  onConvertText,
  onConvertMath,
  onAutoCorrect,
  onCopyText,
  onDelete,
  onReplay,
  onSelectAll,
  onDeselectAll,
}) => {
  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: Math.max(8, bbox.minY - 54),
        left: Math.max(8, bbox.minX),
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-floating)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        animation: 'slideDown 150ms ease-out',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginRight: 2 }}>
        <Move size={13} />
        <span>{selectedStrokes.length} selected</span>
      </div>

      <div className="toolbar-divider" />

      {/* Convert Text */}
      <button
        className="btn-pill btn-primary"
        style={{ padding: '3px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={onConvertText}
        title="Convert selected handwriting to typed text"
      >
        <Sparkles size={13} /> Text
      </button>

      {/* Convert Math */}
      <button
        className="btn-pill"
        style={{ padding: '3px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={onConvertMath}
        title="Convert to Mathematical formula & solve"
      >
        <Calculator size={13} /> Math
      </button>

      {/* Replay Strokes */}
      {onReplay && (
        <button
          className="btn-pill"
          style={{
            padding: '3px 9px',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(37, 99, 235, 0.08)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
          }}
          onClick={onReplay}
          title="Replay selected handwriting strokes step-by-step"
        >
          <Play size={12} /> Replay
        </button>
      )}

      {/* Copy Text */}
      <button
        className="btn-icon"
        style={{ width: 26, height: 26 }}
        onClick={onCopyText}
        title="Copy as text to clipboard"
      >
        <Copy size={13} />
      </button>

      {/* Select All */}
      {onSelectAll && (
        <button
          className="btn-icon"
          style={{ width: 26, height: 26 }}
          onClick={onSelectAll}
          title="Select All items on page (Ctrl+A)"
        >
          <CheckCheck size={14} />
        </button>
      )}

      {/* Delete Selected */}
      <button
        className="btn-icon"
        style={{ width: 26, height: 26, background: 'rgba(239, 68, 68, 0.1)' }}
        onClick={onDelete}
        title="Delete selected items (Del / Backspace)"
      >
        <Trash2 size={13} color="#ef4444" />
      </button>

      {/* Deselect */}
      {onDeselectAll && (
        <button
          className="btn-icon"
          style={{ width: 22, height: 22 }}
          onClick={onDeselectAll}
          title="Deselect (Escape)"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
