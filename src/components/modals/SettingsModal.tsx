import React, { useState, useRef } from 'react';
import { AppSettings } from '../../services/storage/db';
import { X, Key, Tablet, Moon, Sun, Cpu, Check, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testPressure, setTestPressure] = useState<number>(0);
  const [isKeySaved, setIsKeySaved] = useState(false);

  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  // Tablet stylus pressure scratchpad test
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawTestPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons > 0) {
      drawTestPoint(e);
    }
  };

  const drawTestPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let p = e.pressure;
    if (e.pointerType !== 'pen' || p === 0) p = 0.5;

    // Apply sensitivity curve
    if (localSettings.tabletSensitivity === 'soft') p = Math.pow(p, 0.7);
    else if (localSettings.tabletSensitivity === 'firm') p = Math.pow(p, 1.4);

    setTestPressure(p);

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, p * 12), 0, Math.PI * 2);
    ctx.fill();
  };

  const clearTestCanvas = () => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTestPressure(0);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    setIsKeySaved(true);
    setTimeout(() => {
      setIsKeySaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            Application Settings & Tablet Calibration
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Section: Gemini API Key */}
          <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <Key size={16} color="#2563eb" />
              <span>Google Gemini API Key (Multimodal AI)</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Enables Tamil & English handwriting recognition, math problem solver, and notes summarizer.
              Stored privately in your local browser storage.
            </p>
            <input
              type="password"
              className="text-input"
              value={localSettings.geminiApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
            />
          </div>

          {/* Section: Recognition Engine Selection */}
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={16} /> Recognition Engine
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                className={`btn-pill ${!localSettings.useOfflineFallback ? 'btn-primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setLocalSettings({ ...localSettings, useOfflineFallback: false })}
              >
                Gemini Cloud AI (Recommended)
              </button>
              <button
                type="button"
                className={`btn-pill ${localSettings.useOfflineFallback ? 'btn-primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setLocalSettings({ ...localSettings, useOfflineFallback: true })}
              >
                Offline Engine
              </button>
            </div>
          </div>

          {/* Section: Tablet Calibration & Pressure Scratchpad */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
                <Tablet size={16} color="#10b981" />
                <span>Pen Tablet Pressure Test & Calibration</span>
              </div>
              <button className="btn-pill" style={{ fontSize: 11, padding: '2px 8px' }} onClick={clearTestCanvas}>
                Clear
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Draw below with your stylus (Wacom, Huion, XP-Pen, Surface Pen) to verify pressure sensitivity.
            </p>

            {/* Pressure Bar Meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, width: 60 }}>Pressure:</span>
              <div style={{ flex: 1, height: 10, background: 'var(--bg-muted)', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.round(testPressure * 100)}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                    transition: 'width 50ms',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, width: 40, textAlign: 'right' }}>
                {Math.round(testPressure * 100)}%
              </span>
            </div>

            {/* Interactive Scratchpad */}
            <canvas
              ref={testCanvasRef}
              width={560}
              height={100}
              style={{
                width: '100%',
                height: 100,
                background: '#ffffff',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                touchAction: 'none',
                cursor: 'crosshair',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
            />

            {/* Sensitivity Curve selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Sensitivity:</span>
              {(['soft', 'normal', 'firm'] as const).map((curve) => (
                <label key={curve} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sensitivity"
                    checked={localSettings.tabletSensitivity === curve}
                    onChange={() => setLocalSettings({ ...localSettings, tabletSensitivity: curve })}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{curve}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section: Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Display Theme</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Switch between modern dark mode and crisp classroom light mode.
              </div>
            </div>
            <button
              className="btn-pill"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  theme: localSettings.theme === 'dark' ? 'light' : 'dark',
                })
              }
            >
              {localSettings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{localSettings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-pill" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-pill btn-primary" onClick={handleSave}>
            {isKeySaved ? <Check size={16} /> : <ShieldCheck size={16} />}
            <span>{isKeySaved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
