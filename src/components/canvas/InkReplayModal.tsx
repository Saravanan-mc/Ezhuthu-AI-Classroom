import React, { useState, useEffect, useRef } from 'react';
import { Stroke, Point } from '../../types/ink';
import { Play, Pause, RotateCcw, X, Sparkles } from 'lucide-react';
import { renderStrokeToContext, computeBoundingBox } from '../../engine/strokeEngine';

interface InkReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  strokes: Stroke[];
  recognizedText?: string;
  title?: string;
}

export const InkReplayModal: React.FC<InkReplayModalProps> = ({
  isOpen,
  onClose,
  strokes,
  recognizedText,
  title = 'Handwriting Ink Replay',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [progress, setProgress] = useState(0); // 0 to 1

  const animFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // Total points across all strokes
  const totalPoints = strokes.reduce((acc, s) => acc + s.points.length, 0);

  // Canvas bounds
  const bbox = strokes.length > 0 ? computeBoundingBox(strokes.flatMap((s) => s.points), 40) : null;
  const canvasWidth = bbox ? Math.max(500, Math.min(900, bbox.width + 80)) : 600;
  const canvasHeight = bbox ? Math.max(300, Math.min(600, bbox.height + 80)) : 380;
  const offsetX = bbox ? bbox.minX - 40 : 0;
  const offsetY = bbox ? bbox.minY - 40 : 0;

  // Render canvas at given progress (0 to 1)
  const drawAtProgress = (prog: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle paper grid pattern
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    for (let y = 30; y < canvas.height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (totalPoints === 0) return;

    const targetPointsCount = Math.floor(prog * totalPoints);
    let pointsRendered = 0;

    ctx.save();
    ctx.translate(-offsetX, -offsetY);

    for (const stroke of strokes) {
      if (pointsRendered >= targetPointsCount) break;

      const remainingAllowed = targetPointsCount - pointsRendered;
      if (stroke.points.length <= remainingAllowed) {
        // Full stroke
        renderStrokeToContext(ctx, stroke);
        pointsRendered += stroke.points.length;
      } else {
        // Partial stroke in progress
        const partialPoints: Point[] = stroke.points.slice(0, remainingAllowed);
        if (partialPoints.length > 0) {
          const partialStroke: Stroke = {
            ...stroke,
            points: partialPoints,
            bbox: computeBoundingBox(partialPoints),
          };
          renderStrokeToContext(ctx, partialStroke);

          // Glowing animated pen tip cursor
          const tip = partialPoints[partialPoints.length - 1];
          ctx.save();
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }
        pointsRendered += remainingAllowed;
        break;
      }
    }

    ctx.restore();
  };

  // Animation Loop
  useEffect(() => {
    if (!isOpen || strokes.length === 0) return;

    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
    lastTimeRef.current = null;

    const totalDurationMs = Math.max(1200, Math.min(6000, totalPoints * 25));

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        const deltaProgress = (delta / totalDurationMs) * speed;
        progressRef.current = Math.min(1, progressRef.current + deltaProgress);
        setProgress(progressRef.current);
        drawAtProgress(progressRef.current);

        if (progressRef.current >= 1) {
          setIsPlaying(false);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, strokes, speed, isPlaying]);

  // Redraw when scrubber dragged
  const handleSeek = (newProg: number) => {
    progressRef.current = newProg;
    setProgress(newProg);
    drawAtProgress(newProg);
  };

  const handleRestart = () => {
    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
    lastTimeRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: canvasWidth + 40,
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 180ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(37,99,235,0.1)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
              }}
            >
              OneNote Ink Replay
            </span>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close replay">
            <X size={18} />
          </button>
        </div>

        {/* Synchronized Converted Text Header Banner */}
        {recognizedText && (
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(37, 99, 235, 0.05)',
              borderBottom: '1px solid rgba(37, 99, 235, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Converted Text:
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                fontFamily: 'inherit',
              }}
            >
              {recognizedText}
            </span>
          </div>
        )}

        {/* Canvas Animation Stage */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: 12,
            overflow: 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.04)',
            }}
          />
        </div>

        {/* Player Controls Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}
        >
          {/* Scrubber Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32 }}>
              {Math.round(progress * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={progress}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 50 }}>
              {strokes.length} stroke{strokes.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Play / Pause */}
              <button
                className="btn-pill btn-primary"
                onClick={() => {
                  if (progress >= 1) handleRestart();
                  else setIsPlaying(!isPlaying);
                }}
                style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? 'Pause' : progress >= 1 ? 'Replay' : 'Play'}
              </button>

              {/* Restart */}
              <button
                className="btn-icon"
                onClick={handleRestart}
                title="Restart Replay"
                style={{ width: 32, height: 32 }}
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Speed Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Speed:</span>
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: '1px solid var(--border-color)',
                    background: speed === s ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    color: speed === s ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
