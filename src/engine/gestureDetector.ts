import { Stroke, Point } from '../types/ink';

export interface GestureResult {
  type: 'scratch' | 'strikethrough' | 'none';
  targetStrokeIds: string[];
}

/**
 * Detects if a stroke is a Nebo scratch-out (scribble) gesture
 * Characteristics of scratch-out:
 * - Minimum 4 sharp direction reversals along the X axis (back-and-forth zig-zag)
 * - Moderate width-to-height aspect ratio or high stroke length in a compact box
 */
export function detectScratchOutGesture(stroke: Stroke, existingStrokes: Stroke[]): GestureResult {
  const pts = stroke.points;
  if (pts.length < 8) return { type: 'none', targetStrokeIds: [] };

  let xReversals = 0;
  let prevDx = 0;

  for (let i = 2; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    if (Math.abs(dx) > 3) {
      if (prevDx !== 0 && ((dx > 0 && prevDx < 0) || (dx < 0 && prevDx > 0))) {
        xReversals++;
      }
      prevDx = dx;
    }
  }

  // If >= 4 horizontal zig-zag reversals, it's a scratch-out!
  if (xReversals >= 4) {
    const scratchBbox = stroke.bbox;
    // Find all existing strokes that significantly overlap with this scratch gesture
    const struckIds: string[] = [];

    for (const s of existingStrokes) {
      if (s.id === stroke.id) continue;
      const b = s.bbox;
      // Overlap test
      const xOverlap = Math.max(0, Math.min(scratchBbox.maxX, b.maxX) - Math.max(scratchBbox.minX, b.minX));
      const yOverlap = Math.max(0, Math.min(scratchBbox.maxY, b.maxY) - Math.max(scratchBbox.minY, b.minY));

      const yMatches = scratchBbox.minY <= b.maxY + 4 && scratchBbox.maxY >= b.minY - 4;
      if (xOverlap > 8 && (yOverlap > 0 || yMatches)) {
        struckIds.push(s.id);
      }
    }

    if (struckIds.length > 0) {
      return { type: 'scratch', targetStrokeIds: struckIds };
    }
  }

  // Check strike-through: mostly horizontal straight line (dx >> dy) cutting through strokes
  const width = stroke.bbox.width;
  const height = stroke.bbox.height;
  if (width > 60 && height < 15 && xReversals <= 1) {
    const struckIds: string[] = [];
    for (const s of existingStrokes) {
      if (s.id === stroke.id) continue;
      const b = s.bbox;
      if (
        stroke.bbox.minX <= b.maxX &&
        stroke.bbox.maxX >= b.minX &&
        stroke.bbox.minY >= b.minY - 10 &&
        stroke.bbox.maxY <= b.maxY + 10
      ) {
        struckIds.push(s.id);
      }
    }
    if (struckIds.length > 0) {
      return { type: 'strikethrough', targetStrokeIds: struckIds };
    }
  }

  return { type: 'none', targetStrokeIds: [] };
}
