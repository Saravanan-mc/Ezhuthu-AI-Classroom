import { Stroke, BoundingBox } from '../../types/ink';
import { RecognitionResult, RecognitionOptions, LineResult } from '../../types/ai';
import { computeBoundingBox, renderStrokeToContext } from '../../engine/strokeEngine';
import { recognizeWithGemini } from './geminiEngine';
import { recognizeOffline } from './offlineEngine';
import { recognizeStrokesWithGoogle } from './googleHandwriting';
import { solveMathExpression } from './mathSolver';

export interface IHandwritingRecognitionEngine {
  recognizeStrokes(
    strokes: Stroke[],
    options: RecognitionOptions
  ): Promise<RecognitionResult>;
}

/**
 * Creates an image data URL of the strokes with high contrast for the recognition model
 */
export function renderStrokesToImage(strokes: Stroke[], padding = 24): { dataUrl: string; bbox: BoundingBox } {
  const bbox = computeBoundingBox(strokes.flatMap((s) => s.points), padding);
  const width = Math.max(80, Math.min(2400, Math.ceil(bbox.width)));
  const height = Math.max(40, Math.min(2400, Math.ceil(bbox.height)));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Pure white background for optimal OCR / Vision recognition
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // Translate to crop origin
  ctx.translate(-bbox.minX, -bbox.minY);

  // Render strokes in crisp black for maximum model contrast
  for (const stroke of strokes) {
    const renderCopy: Stroke = {
      ...stroke,
      color: stroke.preset === 'highlighter' ? '#999999' : '#000000',
      opacity: 1,
      width: Math.max(2.5, stroke.width),
    };
    renderStrokeToContext(ctx, renderCopy);
  }

  ctx.restore();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    bbox,
  };
}

export class HandwritingRecognitionEngine implements IHandwritingRecognitionEngine {
  async recognizeStrokes(
    strokes: Stroke[],
    options: RecognitionOptions
  ): Promise<RecognitionResult> {
    if (!strokes || strokes.length === 0) {
      return {
        id: 'rec_' + Date.now(),
        rawText: '',
        languageDetected: 'mixed',
        overallConfidence: 1,
        lines: [],
        timestamp: Date.now(),
      };
    }

    const bbox = computeBoundingBox(strokes.flatMap((s) => s.points), 8);

    // 1. If Gemini API Key is configured and not forced offline, use Gemini Vision Engine
    if (options.apiKey && !options.useOfflineFallback) {
      try {
        const { dataUrl } = renderStrokesToImage(strokes);
        const result = await recognizeWithGemini(dataUrl, strokes, bbox, options);
        return result;
      } catch (err) {
        console.warn('Gemini recognition failed, falling back to Google / Offline engine:', err);
      }
    }

    // 2. Real-time Google Input Tools Handwriting Recognition (online, client-side, zero auth needed)
    if (!options.useOfflineFallback && navigator.onLine) {
      try {
        const langParam = options.languageMode === 'tamil' ? 'ta' : 'en';
        const googleResult = await recognizeStrokesWithGoogle(strokes, bbox, langParam);

        if (googleResult && googleResult.text) {
          const rawText = googleResult.text;
          const mathSol = solveMathExpression(rawText);

          const lines: LineResult[] = rawText.split('\n').map((lineText, idx) => ({
            lineIndex: idx + 1,
            text: lineText,
            language: options.languageMode === 'tamil' ? 'tamil' : mathSol ? 'math' : 'english',
            words: lineText.split(' ').map((w) => ({
              word: w,
              confidence: 0.96,
              isUncertain: false,
              alternatives: googleResult.alternatives || [],
            })),
          }));

          return {
            id: 'rec_goog_' + Date.now(),
            rawText,
            languageDetected: options.languageMode === 'tamil' ? 'tamil' : mathSol ? 'math' : 'english',
            overallConfidence: 0.95,
            lines,
            timestamp: Date.now(),
            mathSolution: mathSol
              ? {
                  latexFormula: mathSol.expression,
                  expression: mathSol.expression,
                  result: mathSol.solution,
                  steps: mathSol.steps || [mathSol.solution],
                  explanation: 'Calculated from handwriting input.',
                }
              : undefined,
          };
        }
      } catch (err) {
        console.warn('Google handwriting service error, falling back to local engine:', err);
      }
    }

    // 3. Pure local offline recognition fallback
    return recognizeOffline(strokes, bbox, options);
  }
}

export const recognitionEngine = new HandwritingRecognitionEngine();
