import React, { useState, useEffect } from 'react';
import { BoundingBox } from '../../types/ink';
import { Sparkles, Check, Calculator, Copy, CheckSquare, X, Edit2, Play } from 'lucide-react';

interface NeboLiveConversionBarProps {
  bbox: BoundingBox;
  recognizedText: string;
  mathSolution?: string;
  isRecognizing: boolean;
  pageWidth?: number;
  onConvertToText: (textToUse?: string) => void;
  onConvertToMath?: () => void;
  onConvertToTodo?: () => void;
  onReplayLine?: () => void;
  onForceFullText?: () => void;
  onDismiss: () => void;
}

export const NeboLiveConversionBar: React.FC<NeboLiveConversionBarProps> = ({
  bbox,
  recognizedText,
  mathSolution,
  isRecognizing,
  pageWidth,
  onConvertToText,
  onConvertToMath,
  onConvertToTodo,
  onReplayLine,
  onForceFullText,
  onDismiss,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState(recognizedText);

  useEffect(() => {
    setCustomText(recognizedText);
    setIsEditing(false);
  }, [recognizedText]);

  if (!recognizedText && !isRecognizing) return null;

  // Position the bar on the LEFT SIDE of the line (never right side, never top)
  const barEstimatedWidth = 420;
  // Place to the left of the stroke bounding box
  let leftPos = bbox.minX - barEstimatedWidth - 14;
  let topPos = Math.max(8, bbox.minY + Math.max(0, (bbox.height - 42) / 2));

  // If placing directly to the left would go off-canvas (stroke starts near left edge),
  // dock at left margin (x = 16) and avoid covering ink by placing below if needed
  if (leftPos < 16) {
    leftPos = 16;
    if (bbox.minX < 360) {
      topPos = Math.max(8, bbox.maxY + 10);
    }
  }

  const handleSaveEditAndConvert = () => {
    onConvertToText(customText.trim() || recognizedText);
  };

  return (
    <div
      className="nebo-live-bar glass-panel"
      style={{
        position: 'absolute',
        top: topPos,
        left: leftPos,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0,0,0,0.08)',
        background: 'var(--bg-primary)',
        border: '1.5px solid var(--accent-primary)',
        animation: 'fadeIn 160ms ease-out',
        userSelect: 'none',
        maxWidth: 620,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={14} color="var(--accent-primary)" />
        {isRecognizing ? (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Recognizing handwriting...
          </span>
        ) : isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="text"
              value={customText}
              autoFocus
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEditAndConvert();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 4,
                padding: '2px 8px',
                outline: 'none',
                minWidth: 160,
              }}
              placeholder="Correct text..."
            />
            <button
              className="btn-icon"
              style={{ width: 22, height: 22, color: '#10b981' }}
              onClick={handleSaveEditAndConvert}
              title="Save correction and convert"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
              onClick={() => setIsEditing(true)}
              title="Click to correct text if there is a mistake"
            >
              {customText}
            </span>

            {/* Quick edit pencil button */}
            <button
              className="btn-icon"
              style={{ width: 20, height: 20, padding: 0, opacity: 0.7 }}
              onClick={() => setIsEditing(true)}
              title="Correct handwriting recognition mistakes"
            >
              <Edit2 size={11} />
            </button>

            {mathSolution && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {mathSolution}
              </span>
            )}
          </div>
        )}
      </div>

      {!isRecognizing && recognizedText && !isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          {/* In-place Convert to Text (Replace Line) */}
          <button
            className="btn-pill btn-primary"
            style={{
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => onConvertToText(customText)}
            title="Replace drawn line with clean typed text in-place"
          >
            <Check size={12} /> Replace Line
          </button>

          {/* Replay Line (animated stroke drawing) */}
          {onReplayLine && (
            <button
              className="btn-pill"
              style={{
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
              }}
              onClick={onReplayLine}
              title="Replay drawn handwriting line stroke-by-stroke with text"
            >
              <Play size={11} /> Replay
            </button>
          )}

          {/* Force Full Text conversion button */}
          {onForceFullText && (
            <button
              className="btn-pill"
              style={{
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(139, 92, 246, 0.12)',
                color: '#7c3aed',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
              onClick={onForceFullText}
              title="Force convert all handwritten notes to full typed text"
            >
              <Sparkles size={11} /> Full Text
            </button>
          )}

          {/* If math, Convert to solved math */}
          {mathSolution && onConvertToMath && (
            <button
              className="btn-pill"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={onConvertToMath}
              title="Convert to solved math result"
            >
              <Calculator size={12} /> Solve
            </button>
          )}

          {/* Convert to To-Do checklist */}
          {onConvertToTodo && (
            <button
              className="btn-icon"
              style={{ width: 24, height: 24, padding: 0 }}
              onClick={onConvertToTodo}
              title="Convert to To-Do checklist item"
            >
              <CheckSquare size={13} color="var(--accent-primary)" />
            </button>
          )}

          {/* Copy to clipboard */}
          <button
            className="btn-icon"
            style={{ width: 24, height: 24, padding: 0 }}
            onClick={() => {
              navigator.clipboard.writeText(mathSolution ? `${customText} => ${mathSolution}` : customText);
            }}
            title="Copy recognized text"
          >
            <Copy size={12} />
          </button>

          {/* Dismiss */}
          <button
            className="btn-icon"
            style={{ width: 22, height: 22, padding: 0 }}
            onClick={onDismiss}
            title="Dismiss preview"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
