import React, { useState } from 'react';
import { ToolType, PenPreset, EraserMode, AppMode } from '../../types/ink';
import { LanguageMode } from '../../types/ai';
import {
  Pen,
  Highlighter,
  Eraser,
  Lasso,
  BoxSelect,
  Search,
  Trash2,
  Sparkles,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Settings,
  Download,
  ChevronDown,
  Layers,
  ZoomIn,
  ZoomOut,
  Type,
  CheckSquare,
  LayoutGrid,
  FileSpreadsheet,
} from 'lucide-react';

interface TopToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  penPreset: PenPreset;
  onPenPresetChange: (preset: PenPreset) => void;
  eraserMode: EraserMode;
  onEraserModeChange: (mode: EraserMode) => void;
  languageMode: LanguageMode;
  onLanguageModeChange: (mode: LanguageMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onConvert: () => void;
  onForceFullText?: () => void;
  isSaving?: boolean;
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenBackgroundModal: () => void;
  onOpenSearch?: () => void;
  onClearPage?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  currentTool,
  onToolChange,
  penPreset,
  onPenPresetChange,
  eraserMode,
  onEraserModeChange,
  languageMode,
  onLanguageModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onConvert,
  onForceFullText,
  isSaving,
  onOpenDrawer,
  onOpenSettings,
  onOpenExport,
  onOpenBackgroundModal,
  onOpenSearch,
  onClearPage,
  zoom,
  onZoomChange,
  appMode,
  onSelectAppMode,
}) => {
  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isEraserMenuOpen, setIsEraserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  return (
    <header
      className="top-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 52,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        userSelect: 'none',
        zIndex: 40,
        gap: 8,
      }}
    >
      {/* Left Section: Logo, Drawer, Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Notebooks Drawer button */}
        <button
          className="btn-icon"
          onClick={onOpenDrawer}
          title="Open Notebooks"
          style={{ width: 34, height: 34 }}
        >
          <FolderOpen size={18} />
        </button>

        {/* Branding & App View Mode Switcher (OneNote Canvas <-> Google Keep) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            padding: 3,
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => onSelectAppMode('note')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: appMode === 'note' ? 'var(--accent-primary)' : 'transparent',
              color: appMode === 'note' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
            title="OneNote Canvas + Nebo Interactive Handwriting Mode"
          >
            <FileSpreadsheet size={13} />
            <span>OneNote & Nebo</span>
          </button>

          <button
            onClick={() => onSelectAppMode('keep')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: appMode === 'keep' ? 'var(--accent-primary)' : 'transparent',
              color: appMode === 'keep' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
            title="Google Keep Sticky Notes & Checklists Board"
          >
            <LayoutGrid size={13} />
            <span>Google Keep</span>
          </button>
        </div>
      </div>

      {/* Center Section: Pen & Handwriting Tools (Visible in Note Mode) */}
      {appMode === 'note' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Pen Tool with Preset Dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: currentTool === 'pen' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: currentTool === 'pen' ? 'white' : 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => onToolChange('pen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
                title="Pen (Stylus / Pen Tablet)"
              >
                <Pen size={15} />
                <span style={{ textTransform: 'capitalize' }}>{penPreset}</span>
              </button>
              <button
                onClick={() => setIsPenMenuOpen(!isPenMenuOpen)}
                style={{
                  padding: '6px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <ChevronDown size={12} />
              </button>
            </div>

            {/* Pen presets dropdown */}
            {isPenMenuOpen && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 50,
                  minWidth: 140,
                  padding: 4,
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {(['normal', 'fine', 'marker', 'pencil', 'brush'] as PenPreset[]).map((p) => (
                  <button
                    key={p}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: penPreset === p ? 600 : 400,
                      background: penPreset === p ? 'rgba(37,99,235,0.1)' : 'transparent',
                      color: penPreset === p ? 'var(--accent-primary)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      textTransform: 'capitalize',
                    }}
                    onClick={() => {
                      onPenPresetChange(p);
                      onToolChange('pen');
                      setIsPenMenuOpen(false);
                    }}
                  >
                    {p === 'normal' ? 'Ballpoint Pen' : p === 'brush' ? 'Fountain Pen' : p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Highlighter */}
          <button
            className={`btn-icon ${currentTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => onToolChange('highlighter')}
            title="Highlighter"
            style={{ width: 34, height: 34 }}
          >
            <Highlighter size={16} />
          </button>

          {/* Eraser Tool with Modes */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn-icon ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => onToolChange('eraser')}
              onContextMenu={(e) => {
                e.preventDefault();
                setIsEraserMenuOpen(!isEraserMenuOpen);
              }}
              title="Eraser (Stroke / Area)"
              style={{ width: 34, height: 34 }}
            >
              <Eraser size={16} />
            </button>
          </div>

          {/* Lasso Selection */}
          <button
            className={`btn-icon ${currentTool === 'lasso' ? 'active' : ''}`}
            onClick={() => onToolChange('lasso')}
            title="Lasso Selection (Freehand loop to select)"
            style={{ width: 34, height: 34 }}
          >
            <Lasso size={16} />
          </button>

          {/* Box Marquee Selection */}
          <button
            className={`btn-icon ${currentTool === 'box-select' ? 'active' : ''}`}
            onClick={() => onToolChange('box-select')}
            title="Box Select (Drag rectangular box to select ink & text)"
            style={{ width: 34, height: 34 }}
          >
            <BoxSelect size={16} />
          </button>

          {/* Freeform Typed Text Box Tool (OneNote type anywhere) */}
          <button
            className={`btn-icon ${currentTool === 'text' ? 'active' : ''}`}
            onClick={() => onToolChange('text')}
            title="Type anywhere on canvas"
            style={{ width: 34, height: 34 }}
          >
            <Type size={16} />
          </button>

          {/* Freeform Checklist Tool (OneNote / Keep To-Do anywhere) */}
          <button
            className={`btn-icon ${currentTool === 'checklist' ? 'active' : ''}`}
            onClick={() => onToolChange('checklist')}
            title="Add Checklist / To-Do item on canvas"
            style={{ width: 34, height: 34 }}
          >
            <CheckSquare size={16} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 4px' }} />

          {/* Nebo Live Handwriting Convert Button */}
          <button
            className="btn-pill btn-primary"
            onClick={onConvert}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
            title="Nebo Live Handwriting Recognition & Text Conversion"
          >
            <Sparkles size={14} />
            <span>Convert Ink</span>
          </button>

          {/* Force Full Text Button */}
          {onForceFullText && (
            <button
              className="btn-pill"
              onClick={onForceFullText}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(139, 92, 246, 0.12)',
                color: '#7c3aed',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
              title="Force convert all handwriting on this page directly to typed text"
            >
              <Sparkles size={13} />
              <span>Full Text</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 8px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <span style={{ textTransform: 'uppercase' }}>{languageMode}</span>
              <ChevronDown size={11} />
            </button>

            {isLangMenuOpen && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  zIndex: 50,
                  minWidth: 120,
                  padding: 4,
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {(['auto', 'english', 'tamil', 'math'] as LanguageMode[]).map((m) => (
                  <button
                    key={m}
                    style={{
                      padding: '5px 8px',
                      fontSize: 11,
                      fontWeight: languageMode === m ? 600 : 400,
                      background: languageMode === m ? 'rgba(37,99,235,0.1)' : 'transparent',
                      color: languageMode === m ? 'var(--accent-primary)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      textTransform: 'capitalize',
                    }}
                    onClick={() => {
                      onLanguageModeChange(m);
                      setIsLangMenuOpen(false);
                    }}
                  >
                    {m === 'auto' ? 'Auto Detect' : m === 'math' ? 'Math Formula' : m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Google Keep Notes & Checklists
        </div>
      )}

      {/* Right Section: Paper Background, Zoom, Undo, Redo, Save, Export, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {appMode === 'note' && (
          <>
            {/* Paper Rule Lines & Background */}
            <button
              className="btn-icon"
              onClick={onOpenBackgroundModal}
              title="Page Style & Rule Lines (OneNote Ruled / Grid)"
              style={{ width: 34, height: 34 }}
            >
              <Layers size={16} />
            </button>

            {/* Zoom Out / In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                className="btn-icon"
                onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
                title="Zoom Out"
                style={{ width: 28, height: 28 }}
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="btn-icon"
                onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
                title="Zoom In"
                style={{ width: 28, height: 28 }}
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Undo / Redo */}
            <button
              className="btn-icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
              style={{ width: 32, height: 32, opacity: canUndo ? 1 : 0.4 }}
            >
              <Undo2 size={16} />
            </button>
            <button
              className="btn-icon"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
              style={{ width: 32, height: 32, opacity: canRedo ? 1 : 0.4 }}
            >
              <Redo2 size={16} />
            </button>

            {/* Clear Page button */}
            {onClearPage && (
              <button
                className="btn-icon"
                onClick={onClearPage}
                title="Clear All Notes on Page"
                style={{ width: 32, height: 32, color: '#ef4444' }}
              >
                <Trash2 size={15} />
              </button>
            )}

            <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px' }} />
          </>
        )}

        {/* Global Search */}
        {onOpenSearch && (
          <button
            className="btn-icon"
            onClick={onOpenSearch}
            title="Global Search (Ctrl+K)"
            style={{ width: 34, height: 34 }}
          >
            <Search size={16} />
          </button>
        )}

        {/* Save */}
        <button
          className="btn-icon"
          onClick={onSave}
          title="Save Notes"
          style={{ width: 34, height: 34 }}
        >
          <Save size={16} color={isSaving ? 'var(--accent-primary)' : 'inherit'} />
        </button>

        {/* Export Modal */}
        <button
          className="btn-icon"
          onClick={onOpenExport}
          title="Export Notes (PDF / Image / Text)"
          style={{ width: 34, height: 34 }}
        >
          <Download size={16} />
        </button>

        {/* Settings */}
        <button
          className="btn-icon"
          onClick={onOpenSettings}
          title="Settings & API Key"
          style={{ width: 34, height: 34 }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
