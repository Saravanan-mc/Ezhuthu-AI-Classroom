import React from 'react';
import { AppMode, RecognitionTriggerMode } from '../../types/ink';
import { BookOpen, LayoutGrid, Presentation, Zap } from 'lucide-react';

interface ModeSelectorProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  triggerMode: RecognitionTriggerMode;
  onSelectTriggerMode: (mode: RecognitionTriggerMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  appMode,
  onSelectAppMode,
  triggerMode,
  onSelectTriggerMode,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Primary Modes */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-muted)',
          borderRadius: 'var(--radius-full)',
          padding: 2,
          gap: 2,
        }}
      >
        <button
          className={`btn-pill ${appMode === 'note' ? 'btn-primary' : ''}`}
          style={{ padding: '3px 10px', fontSize: 12, border: 'none' }}
          onClick={() => onSelectAppMode('note')}
          title="OneNote & Nebo Mode"
        >
          <BookOpen size={13} /> OneNote
        </button>

        <button
          className={`btn-pill ${appMode === 'keep' ? 'btn-primary' : ''}`}
          style={{ padding: '3px 10px', fontSize: 12, border: 'none' }}
          onClick={() => onSelectAppMode('keep')}
          title="Google Keep Board Mode"
        >
          <LayoutGrid size={13} /> Keep
        </button>

        <button
          className={`btn-pill ${appMode === 'whiteboard' ? 'btn-primary' : ''}`}
          style={{ padding: '3px 10px', fontSize: 12, border: 'none' }}
          onClick={() => onSelectAppMode('whiteboard')}
          title="Whiteboard Mode"
        >
          <Presentation size={13} /> Whiteboard
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Recognition Trigger Mode Pill */}
      <button
        className="btn-pill"
        style={{
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: triggerMode === 'smart' ? '#16a34a' : 'inherit',
          borderColor: triggerMode === 'smart' ? '#86efac' : 'var(--border-subtle)',
          backgroundColor: triggerMode === 'smart' ? '#f0fdf4' : 'transparent',
        }}
        onClick={() => {
          const next = triggerMode === 'smart' ? 'instant' : triggerMode === 'instant' ? 'manual' : 'smart';
          onSelectTriggerMode(next);
        }}
        title="Handwriting recognition trigger timing"
      >
        <Zap size={12} color={triggerMode === 'smart' ? '#16a34a' : 'currentColor'} />
        <span style={{ textTransform: 'capitalize' }}>{triggerMode} Live OCR</span>
      </button>
    </div>
  );
};
