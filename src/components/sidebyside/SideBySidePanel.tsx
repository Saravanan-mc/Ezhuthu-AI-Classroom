import React, { useState } from 'react';
import { RecognitionResult, WordConfidence } from '../../types/ai';
import { X, Check, RefreshCw, Copy, Sparkles, Volume2, Calculator } from 'lucide-react';
import { speakText } from '../../services/ai/aiTutor';

interface SideBySidePanelProps {
  recognitionResult: RecognitionResult | null;
  cropImageUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (editedText: string) => void;
  onRetry: () => void;
  onReplaceOnCanvas?: (newText: string) => void;
}

export const SideBySidePanel: React.FC<SideBySidePanelProps> = ({
  recognitionResult,
  cropImageUrl,
  isOpen,
  onClose,
  onAccept,
  onRetry,
  onReplaceOnCanvas,
}) => {
  const [editedText, setEditedText] = useState('');
  const [activeWordPopover, setActiveWordPopover] = useState<{
    lineIdx: number;
    wordIdx: number;
    word: WordConfidence;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (recognitionResult) {
      setEditedText(recognitionResult.rawText);
      setActiveWordPopover(null);
    }
  }, [recognitionResult]);

  if (!isOpen || !recognitionResult) return null;

  const handleSelectAlternative = (newWord: string) => {
    if (!activeWordPopover) return;
    const { word } = activeWordPopover;
    // Replace in editedText
    const updated = editedText.replace(word.word, newWord);
    setEditedText(updated);
    setActiveWordPopover(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    speakText(editedText);
  };

  const isTamil = recognitionResult.languageDetected === 'tamil';
  const isMixed = recognitionResult.languageDetected === 'mixed';

  return (
    <aside className="side-panel">
      {/* Header */}
      <div className="side-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            Handwriting → Text
          </h3>
          <span
            className="lang-badge"
            style={{
              backgroundColor: isTamil ? 'var(--accent-tamil-light)' : isMixed ? '#ede9fe' : '#ecfdf5',
              color: isTamil ? 'var(--accent-tamil)' : isMixed ? '#6d28d9' : '#047857',
            }}
          >
            {isTamil ? 'தமிழ் (Tamil)' : isMixed ? 'Tamil + English Mixed' : recognitionResult.languageDetected.toUpperCase()}
          </span>
        </div>
        <button className="btn-icon" onClick={onClose} title="Close Panel">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="side-panel-content">
        {/* Original Handwriting Section */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            ORIGINAL HANDWRITING
          </div>
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              background: '#ffffff',
              maxHeight: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {cropImageUrl ? (
              <img
                src={cropImageUrl}
                alt="Handwriting Crop"
                style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Selected Canvas Area</span>
            )}
          </div>
        </div>

        {/* Word Uncertainty & Alternatives Guide */}
        {recognitionResult.lines.some((l) => l.words.some((w) => w.isUncertain)) && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              fontSize: 12,
              color: '#92400e',
            }}
          >
            💡 <strong>Tap highlighted words</strong> below to pick alternative Tamil/English spellings.
          </div>
        )}

        {/* Interactive Words View */}
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            RECOGNIZED STRUCTURE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.7 }}>
            {recognitionResult.lines.map((line, lIdx) => (
              <div key={lIdx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                {line.words.map((w, wIdx) => {
                  const hasAlts = w.alternatives && w.alternatives.length > 0;
                  const isPopActive =
                    activeWordPopover?.lineIdx === lIdx && activeWordPopover?.wordIdx === wIdx;

                  return (
                    <span key={wIdx} style={{ position: 'relative', display: 'inline-block' }}>
                      <span
                        className={w.isUncertain ? 'uncertain-word' : ''}
                        style={{
                          marginRight: 6,
                          cursor: hasAlts ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (hasAlts) {
                            setActiveWordPopover(
                              isPopActive ? null : { lineIdx: lIdx, wordIdx: wIdx, word: w }
                            );
                          }
                        }}
                      >
                        {w.word}
                      </span>

                      {/* Alternatives Popover */}
                      {isPopActive && (
                        <div className="alts-popover glass-panel">
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px' }}>
                            Alternative suggestions:
                          </div>
                          {w.alternatives.map((alt, aIdx) => (
                            <button
                              key={aIdx}
                              className="alt-item tamil-text"
                              onClick={() => handleSelectAlternative(alt)}
                            >
                              {alt}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Math Solution view if available */}
        {recognitionResult.mathSolution && (
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-sm)',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              <Calculator size={16} /> Math Solution
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d', marginBottom: 6 }}>
              {recognitionResult.mathSolution.expression} = {recognitionResult.mathSolution.result}
            </div>
            <ul style={{ fontSize: 13, color: '#166534', paddingLeft: 18, lineHeight: 1.5 }}>
              {recognitionResult.mathSolution.steps.map((step, sIdx) => (
                <li key={sIdx}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Editable Text Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              EDITABLE TEXT (TAMIL / ENGLISH)
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                className="btn-icon"
                style={{ width: 28, height: 28 }}
                onClick={handleSpeak}
                title="Listen to pronunciation"
              >
                <Volume2 size={14} />
              </button>
              <button
                className="btn-icon"
                style={{ width: 28, height: 28 }}
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="tamil-text text-input"
            rows={6}
            style={{
              flex: 1,
              resize: 'vertical',
              fontSize: 15,
              lineHeight: 1.6,
              minHeight: 140,
            }}
            placeholder="Recognized text will appear here..."
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-muted)',
          gap: 8,
        }}
      >
        <button className="btn-pill" onClick={onRetry} title="Try recognizing again">
          <RefreshCw size={14} /> Retry
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {onReplaceOnCanvas && (
            <button
              className="btn-pill"
              onClick={() => onReplaceOnCanvas(editedText)}
              title="Insert recognized text directly onto canvas"
            >
              <Sparkles size={14} /> Replace Canvas
            </button>
          )}

          <button
            className="btn-pill btn-primary"
            onClick={() => onAccept(editedText)}
            title="Accept recognized text"
          >
            <Check size={14} /> {copied ? 'Copied!' : 'Accept Text'}
          </button>
        </div>
      </div>
    </aside>
  );
};
