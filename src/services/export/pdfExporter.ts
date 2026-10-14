import { jsPDF } from 'jspdf';
import { Page } from '../../types/notebook';
import { renderPageBackground, getPageDimensions } from '../../engine/backgroundRenderer';
import { renderStrokeToContext } from '../../engine/strokeEngine';

export async function exportPageToPDF(page: Page, includeRecognizedText = true): Promise<void> {
  const { width, height } = getPageDimensions(page.background.pageSize);

  // Render to offscreen canvas
  const canvas = document.createElement('canvas');
  const dpr = 2; // High-res 2x scaling for crisp print
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;
  ctx.scale(dpr, dpr);

  // 1. Background
  renderPageBackground(ctx, page.background, width, height);

  // 2. Shapes
  for (const s of page.shapes) {
    ctx.save();
    ctx.strokeStyle = s.strokeColor;
    ctx.lineWidth = s.strokeWidth;
    ctx.fillStyle = s.fillColor;
    if (s.type === 'rectangle') {
      ctx.strokeRect(s.x, s.y, s.width, s.height);
    } else if (s.type === 'circle') {
      ctx.beginPath();
      ctx.arc(s.x + s.width / 2, s.y + s.height / 2, Math.abs(s.width) / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.width, s.y + s.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Text Blocks
  if (page.textBlocks) {
    for (const tb of page.textBlocks) {
      ctx.save();
      ctx.fillStyle = tb.color || '#0f172a';
      ctx.font = `${tb.fontWeight === 'bold' ? 'bold ' : ''}${tb.fontSize || 16}px system-ui, sans-serif`;
      ctx.fillText(tb.text, tb.x, tb.y + (tb.fontSize || 16));
      ctx.restore();
    }
  }

  // 4. Checklists
  if (page.checklists) {
    for (const chk of page.checklists) {
      const x = chk.x || 80;
      const y = chk.y || 80;
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.fillStyle = chk.completed ? '#2563eb' : 'transparent';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 14, 14);
      if (chk.completed) {
        ctx.fillRect(x, y, 14, 14);
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 7);
        ctx.lineTo(x + 6, y + 11);
        ctx.lineTo(x + 11, y + 4);
        ctx.stroke();
      }
      ctx.fillStyle = chk.completed ? '#94a3b8' : '#1e293b';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(chk.text, x + 22, y + 12);
      ctx.restore();
    }
  }

  // 5. Strokes
  for (const st of page.strokes) {
    renderStrokeToContext(ctx, st, 1);
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const orientation = width > height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [width * 0.75, height * 0.75],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, width * 0.75, height * 0.75);

  // If page has recognized items and user wants text included
  if (includeRecognizedText && page.recognizedItems && page.recognizedItems.length > 0) {
    pdf.addPage([width * 0.75, height * 0.75]);
    pdf.setFontSize(18);
    pdf.text('Recognized Notes', 40, 50);
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);

    let yPos = 80;
    for (const rec of page.recognizedItems) {
      const lines = rec.rawText.split('\n');
      for (const line of lines) {
        if (yPos > height * 0.75 - 40) {
          pdf.addPage([width * 0.75, height * 0.75]);
          yPos = 50;
        }
        pdf.text(line, 40, yPos);
        yPos += 20;
      }
    }
  }

  pdf.save(`${page.title || 'Handwritten_Notes'}.pdf`);
}
