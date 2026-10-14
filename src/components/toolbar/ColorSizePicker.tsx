import React, { useState } from 'react';
import { PenSettings, PenPreset } from '../../types/ink';
import { Palette } from 'lucide-react';

interface ColorSizePickerProps {
  settings: PenSettings;
  onChange: (newSettings: PenSettings) => void;
  onPresetChange?: (preset: PenPreset) => void;
}

export const EXTENDED_PALETTE = [
  '#0f172a', // Jet Black
  '#475569', // Slate Gray
  '#1e40af', // Royal Blue
  '#0284c7', // Sky Blue
  '#06b6d4', // Cyan
  '#0d9488', // Teal
  '#047857', // Emerald Green
  '#16a34a', // Leaf Green
  '#65a30d', // Lime Green
  '#ca8a04', // Olive Gold
  '#d97706', // Amber Orange
  '#ea580c', // Tangerine
  '#dc2626', // Crimson Red
  '#b91c1c', // Ruby Dark Red
  '#db2777', // Hot Pink
  '#9333ea', // Royal Violet
  '#6d28d9', // Deep Purple
  '#4f46e5', // Indigo
  '#78350f', // Espresso Brown
  '#f59e0b', // Highlighter Yellow
];

export const ColorSizePicker: React.FC<ColorSizePickerProps> = ({
  settings,
  onChange,
}) => {
  const [showMoreColors, setShowMoreColors] = useState(false);

  return (
    <div className="glass-panel floating-palette" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
      {/* Colors Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', maxWidth: showMoreColors ? 320 : 210 }}>
        {(showMoreColors ? EXTENDED_PALETTE : EXTENDED_PALETTE.slice(0, 10)).map((c) => (
          <button
            key={c}
            className={`color-dot ${settings.color === c ? 'active' : ''}`}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: c,
              border: settings.color === c ? '2px solid white' : '1px solid rgba(0,0,0,0.15)',
              boxShadow: settings.color === c ? '0 0 0 2px var(--accent-primary)' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => onChange({ ...settings, color: c })}
            title={c}
          />
        ))}

        {/* Toggle more colors / custom picker */}
        <button
          className="btn-icon"
          style={{ width: 20, height: 20, padding: 0 }}
          onClick={() => setShowMoreColors(!showMoreColors)}
          title={showMoreColors ? 'Fewer colors' : 'More colors'}
        >
          <Palette size={13} />
        </button>

        {/* Native custom color picker */}
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="Pick custom color">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => onChange({ ...settings, color: e.target.value })}
            style={{ width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
          />
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* Size slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 26, textAlign: 'right' }}>
          {settings.size}px
        </span>
        <input
          type="range"
          min={1}
          max={36}
          value={settings.size}
          onChange={(e) => onChange({ ...settings, size: Number(e.target.value) })}
          style={{ width: 70, cursor: 'pointer' }}
          title="Stroke Width"
        />
      </div>

      <div className="toolbar-divider" />

      {/* Pressure Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={settings.pressureEnabled}
          onChange={(e) => onChange({ ...settings, pressureEnabled: e.target.checked })}
        />
        <span>Pressure</span>
      </label>
    </div>
  );
};
