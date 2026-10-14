import { PageBackgroundConfig, PageSizeType } from '../types/ink';

export function getPageDimensions(size: PageSizeType, customW = 1200, customH = 1600): { width: number; height: number } {
  switch (size) {
    case 'a4':
      return { width: 1240, height: 1754 }; // A4 @ ~150 DPI
    case 'a5':
      return { width: 874, height: 1240 };
    case 'letter':
      return { width: 1275, height: 1650 };
    case 'infinite':
      return { width: 3200, height: 4200 };
    case 'custom':
    default:
      return { width: customW, height: customH };
  }
}

/**
 * Draws the paper background and guides onto the canvas
 */
export function renderPageBackground(
  ctx: CanvasRenderingContext2D,
  config: PageBackgroundConfig,
  width: number,
  height: number
): void {
  ctx.save();

  // 1. Fill base paper color
  ctx.fillStyle = config.paperColor || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = config.lineColor || '#e2e8f0';
  ctx.lineWidth = 1;

  const margin = config.margin || 60;
  const spacing = config.lineSpacing || 32;

  switch (config.type) {
    case 'blank':
      // Plain white/paper canvas
      break;

    case 'ruled':
    case 'narrow-ruled': {
      const lineGap = config.type === 'narrow-ruled' ? 24 : spacing;

      // Draw red/coral notebook margin line
      ctx.beginPath();
      ctx.strokeStyle = '#f87171'; // Coral margin
      ctx.lineWidth = 1.5;
      ctx.moveTo(margin, 0);
      ctx.lineTo(margin, height);
      ctx.stroke();

      // Ruled horizontal lines
      ctx.beginPath();
      ctx.strokeStyle = config.lineColor || '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = lineGap * 2; y < height - lineGap; y += lineGap) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'grid':
    case 'large-grid': {
      const grid = config.type === 'large-grid' ? 44 : (config.gridSize || 24);
      ctx.beginPath();
      ctx.strokeStyle = config.lineColor || '#edf2f7';
      ctx.lineWidth = 0.75;

      // Vertical lines
      for (let x = grid; x < width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      // Horizontal lines
      for (let y = grid; y < height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'dotted': {
      const dotGap = config.gridSize || 28;
      ctx.fillStyle = config.lineColor || '#cbd5e1';
      for (let x = dotGap; x < width; x += dotGap) {
        for (let y = dotGap; y < height; y += dotGap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'cornell': {
      const headerHeight = 100;
      const summaryHeight = 180;
      const cueWidth = Math.max(220, width * 0.28);

      // Outer boundary lines
      ctx.beginPath();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;

      // Header horizontal separator
      ctx.moveTo(0, headerHeight);
      ctx.lineTo(width, headerHeight);

      // Bottom summary separator
      ctx.moveTo(0, height - summaryHeight);
      ctx.lineTo(width, height - summaryHeight);

      // Vertical cue column separator
      ctx.moveTo(cueWidth, headerHeight);
      ctx.lineTo(cueWidth, height - summaryHeight);
      ctx.stroke();

      // Cornell labels (Cue Column, Notes, Summary)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText('TITLE / TOPIC / DATE', 40, 55);
      ctx.fillText('CUES / KEY QUESTIONS', 40, headerHeight + 35);
      ctx.fillText('CLASS NOTES & DIAGRAMS', cueWidth + 30, headerHeight + 35);
      ctx.fillText('SUMMARY / KEY TAKEAWAYS', 40, height - summaryHeight + 35);

      // Ruled lines in main notes section
      ctx.beginPath();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let y = headerHeight + 60; y < height - summaryHeight - 20; y += 30) {
        ctx.moveTo(cueWidth + 10, y);
        ctx.lineTo(width - 20, y);
      }
      ctx.stroke();
      break;
    }

    case 'tamil-guide': {
      // 4-line Tamil handwriting guide rows (ideal for learning uyir, mei, kombu, suzhi)
      const rowGap = 72;
      const step = 14; // each sub-line is 14px apart: Top (ascender), Mid, Base, Descender

      // Red left margin
      ctx.beginPath();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.moveTo(margin, 0);
      ctx.lineTo(margin, height);
      ctx.stroke();

      for (let y = 80; y < height - 60; y += rowGap) {
        // Line 1: Ascender (Top) - Light dashed
        ctx.beginPath();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(margin, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();

        // Line 2: Mid line (Upper body of letter) - Solid blue
        ctx.beginPath();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.moveTo(margin, y + step);
        ctx.lineTo(width - 20, y + step);
        ctx.stroke();

        // Line 3: Baseline (Base of letter) - Solid blue
        ctx.beginPath();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.moveTo(margin, y + step * 2);
        ctx.lineTo(width - 20, y + step * 2);
        ctx.stroke();

        // Line 4: Descender (Tail/Suzhi) - Light dashed
        ctx.beginPath();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(margin, y + step * 3);
        ctx.lineTo(width - 20, y + step * 3);
        ctx.stroke();

        // Light Tamil letter indicator icon/hint on the left margin
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px "Noto Sans Tamil", sans-serif';
        ctx.setLineDash([]);
        ctx.fillText('அ ஆ', margin - 35, y + step * 1.8);
      }
      break;
    }

    case 'custom':
    default: {
      ctx.beginPath();
      ctx.strokeStyle = config.lineColor || '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = spacing; y < height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
