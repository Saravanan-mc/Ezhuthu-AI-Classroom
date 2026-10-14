import { Page, Notebook } from '../../types/notebook';
import { renderPageBackground, getPageDimensions } from '../../engine/backgroundRenderer';
import { renderStrokeToContext } from '../../engine/strokeEngine';

export function exportPageToImage(page: Page, format: 'image/png' | 'image/jpeg' = 'image/png'): void {
  const { width, height } = getPageDimensions(page.background.pageSize);
  const canvas = document.createElement('canvas');
  const dpr = 2; // Crisp resolution
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
    if (s.type === 'rectangle') ctx.strokeRect(s.x, s.y, s.width, s.height);
    else if (s.type === 'circle') {
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

  const link = document.createElement('a');
  link.download = `${page.title || 'Note'}.${format === 'image/jpeg' ? 'jpg' : 'png'}`;
  link.href = canvas.toDataURL(format, 0.95);
  link.click();
}

export function exportNotesToText(page: Page, format: 'txt' | 'markdown'): void {
  let content = '';

  if (format === 'markdown') {
    content += `# ${page.title || 'Notes'}\n\n`;
    content += `*Date: ${new Date(page.createdAt).toLocaleDateString()}*\n\n`;

    if (page.textBlocks && page.textBlocks.length > 0) {
      content += `## Typed Notes\n\n`;
      page.textBlocks.forEach((tb) => {
        content += `${tb.text}\n\n`;
      });
    }

    if (page.checklists && page.checklists.length > 0) {
      content += `## To-Do Items\n\n`;
      page.checklists.forEach((chk) => {
        content += `- [${chk.completed ? 'x' : ' '}] ${chk.text}\n`;
      });
      content += `\n`;
    }

    if (page.recognizedItems && page.recognizedItems.length > 0) {
      content += `## Handwriting Transcription\n\n`;
      page.recognizedItems.forEach((item) => {
        content += `${item.rawText}\n\n`;
        if (item.mathSolution) {
          content += `### Math Solution\n`;
          content += `$$\n${item.mathSolution.latexFormula}\n$$\n`;
          content += `**Result:** ${item.mathSolution.result}\n\n`;
        }
      });
    }
  } else {
    content += `${page.title || 'Notes'}\n`;
    content += `===============================\n\n`;

    if (page.textBlocks && page.textBlocks.length > 0) {
      content += `[Typed Notes]\n`;
      page.textBlocks.forEach((tb) => {
        content += `${tb.text}\n`;
      });
      content += `\n`;
    }

    if (page.checklists && page.checklists.length > 0) {
      content += `[Checklist]\n`;
      page.checklists.forEach((chk) => {
        content += `${chk.completed ? '[X]' : '[ ]'} ${chk.text}\n`;
      });
      content += `\n`;
    }

    if (page.recognizedItems && page.recognizedItems.length > 0) {
      content += `[Handwriting]\n`;
      page.recognizedItems.forEach((item) => {
        content += `${item.rawText}\n`;
        if (item.mathSolution) {
          content += `Math Solution: ${item.mathSolution.result}\n`;
        }
      });
    }
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${page.title || 'Notes'}.${format === 'markdown' ? 'md' : 'txt'}`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportNotebookToJSON(notebook: Notebook): void {
  const dataStr = JSON.stringify(notebook, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${notebook.title || 'Notebook'}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPageToJSON(page: Page): void {
  const dataStr = JSON.stringify(page, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${page.title || 'Page'}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function parseNotebookFromJSON(file: File): Promise<Notebook> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !parsed.id || (!parsed.pages && !parsed.sections)) {
    throw new Error('Invalid notebook JSON file format');
  }
  return parsed as Notebook;
}

export async function copyRecognizedTextToClipboard(page: Page): Promise<boolean> {
  const textParts: string[] = [];

  if (page.textBlocks && page.textBlocks.length > 0) {
    textParts.push(...page.textBlocks.map((t) => t.text));
  }
  if (page.checklists && page.checklists.length > 0) {
    textParts.push(...page.checklists.map((c) => `${c.completed ? '[x]' : '[ ]'} ${c.text}`));
  }
  if (page.recognizedItems && page.recognizedItems.length > 0) {
    textParts.push(...page.recognizedItems.map((i) => i.rawText));
  }

  if (textParts.length === 0) return false;

  try {
    await navigator.clipboard.writeText(textParts.join('\n\n'));
    return true;
  } catch {
    return false;
  }
}
