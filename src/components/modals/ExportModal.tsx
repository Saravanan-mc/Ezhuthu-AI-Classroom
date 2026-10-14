import React, { useState, useRef } from 'react';
import { Page, Notebook } from '../../types/notebook';
import { exportPageToPDF } from '../../services/export/pdfExporter';
import {
  exportPageToImage,
  exportNotesToText,
  copyRecognizedTextToClipboard,
  exportNotebookToJSON,
  exportPageToJSON,
  parseNotebookFromJSON,
} from '../../services/export/imageExporter';
import { X, FileText, Image as ImageIcon, Copy, Check, FileDown, BookOpen, Database, Upload } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: Page;
  notebook?: Notebook;
  onImportNotebook?: (notebook: Notebook) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  page,
  notebook,
  onImportNotebook,
}) => {
  const [includeTextInPDF, setIncludeTextInPDF] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportPageToPDF(page, includeTextInPDF);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    const success = await copyRecognizedTextToClipboard(page);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('No text or handwriting transcription available on this page to copy.');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedNb = await parseNotebookFromJSON(file);
      if (onImportNotebook) {
        onImportNotebook(importedNb);
        setImportStatus(`Successfully restored "${importedNb.title}"!`);
        setTimeout(() => {
          setImportStatus(null);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Invalid JSON notebook file'}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            Export & Backup Notes
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* PDF Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <FileDown size={18} color="#ef4444" />
              <span>PDF Document Export</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Generates a print-ready vector PDF matching your paper background, handwriting, diagrams, and typed notes.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeTextInPDF}
                onChange={(e) => setIncludeTextInPDF(e.target.checked)}
              />
              <span>Include recognized text transcription appendix</span>
            </label>

            <button
              className="btn-pill btn-primary"
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isExporting ? 'Generating PDF...' : 'Download PDF Document'}
            </button>
          </div>

          {/* High-Res Image Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <ImageIcon size={18} color="#2563eb" />
              <span>Image Export (PNG / JPG)</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Export crisp 2x high-resolution image of your page for presentations, social sharing, and notes.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => exportPageToImage(page, 'image/png')}
              >
                Download PNG
              </button>
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => exportPageToImage(page, 'image/jpeg')}
              >
                Download JPG
              </button>
            </div>
          </div>

          {/* Editable Text & Markdown Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <FileText size={18} color="#10b981" />
              <span>Text & Markdown (.md / .txt)</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Export typed notes, to-dos, and recognized handwriting for Microsoft Word, Obsidian, Notion, or Docs.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => exportNotesToText(page, 'markdown')}
              >
                <BookOpen size={14} /> Markdown (.md)
              </button>
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => exportNotesToText(page, 'txt')}
              >
                <FileText size={14} /> Plain Text (.txt)
              </button>
              <button
                className="btn-pill btn-primary"
                style={{ flex: 1.2, justifyContent: 'center' }}
                onClick={handleCopyClipboard}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          {/* Complete JSON Backup & Restore Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <Database size={18} color="#8b5cf6" />
              <span>Structured Data Backup & Restore (.json)</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Export complete structured notebook data with all sections, vector strokes, pressure, and text blocks. Re-import anytime!
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {notebook && (
                <button
                  className="btn-pill"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => exportNotebookToJSON(notebook)}
                >
                  Backup Notebook
                </button>
              )}
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => exportPageToJSON(page)}
              >
                Backup Page
              </button>
              <button
                className="btn-pill"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} /> Restore JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileImport}
              />
            </div>
            {importStatus && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                {importStatus}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-pill" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
