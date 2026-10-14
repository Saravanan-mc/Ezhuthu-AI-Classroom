import React from 'react';
import { PageBackgroundConfig, PageBackgroundType, PageSizeType } from '../../types/ink';
import { X, Check } from 'lucide-react';

interface PageBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PageBackgroundConfig;
  onChangeConfig: (newConfig: PageBackgroundConfig) => void;
}

const BACKGROUND_TYPES: { id: PageBackgroundType; name: string; desc: string; icon: string }[] = [
  { id: 'ruled', name: 'Ruled Notebook', desc: 'Standard horizontal notebook lines with red margin', icon: '📝' },
  { id: 'tamil-guide', name: 'Tamil Writing Guide', desc: '4-line guide lines for practicing Tamil uyir, mei & suzhi', icon: '🇮🇳' },
  { id: 'cornell', name: 'Cornell Notes', desc: 'Classroom layout: header, cue column, notes & summary', icon: '🎓' },
  { id: 'grid', name: 'Grid / Graph', desc: 'Math & science square grid paper', icon: '📐' },
  { id: 'large-grid', name: 'Large Grid', desc: 'Spacious grid for diagrams and engineering', icon: '📊' },
  { id: 'dotted', name: 'Dotted Grid', desc: 'Minimalist bullet journal dot grid', icon: '⁖' },
  { id: 'narrow-ruled', name: 'Narrow Ruled', desc: 'Closer horizontal lines for compact writing', icon: '📃' },
  { id: 'blank', name: 'Blank Canvas', desc: 'Pure white page for freeform drawing', icon: '⬜' },
];

const PAGE_SIZES: { id: PageSizeType; label: string }[] = [
  { id: 'a4', label: 'A4 (Standard Paper)' },
  { id: 'a5', label: 'A5 (Notebook)' },
  { id: 'letter', label: 'US Letter' },
  { id: 'infinite', label: 'Infinite Canvas' },
];

export const PageBackgroundModal: React.FC<PageBackgroundModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            Notebook Page Background & Layout
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Paper Size */}
          <div>
            <label className="input-label">Paper Size</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {PAGE_SIZES.map((ps) => (
                <button
                  key={ps.id}
                  type="button"
                  className={`btn-pill ${config.pageSize === ps.id ? 'btn-primary' : ''}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => onChangeConfig({ ...config, pageSize: ps.id })}
                >
                  {ps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Type Selection */}
          <div>
            <label className="input-label">Page Background Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {BACKGROUND_TYPES.map((bg) => {
                const isSelected = config.type === bg.id;
                return (
                  <div
                    key={bg.id}
                    onClick={() => onChangeConfig({ ...config, type: bg.id })}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16 }}>{bg.icon}</span>
                      {isSelected && <Check size={16} color="var(--primary)" />}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {bg.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {bg.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line Spacing Slider */}
          {['ruled', 'narrow-ruled', 'tamil-guide', 'custom'].includes(config.type) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Line Spacing</label>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{config.lineSpacing}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={56}
                value={config.lineSpacing}
                onChange={(e) => onChangeConfig({ ...config, lineSpacing: Number(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-pill btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
