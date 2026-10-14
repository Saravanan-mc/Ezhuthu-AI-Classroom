import { Stroke, BoundingBox } from '../../types/ink';

export interface HandwritingCandidate {
  text: string;
  alternatives: string[];
}

/**
 * Recognizes handwritten strokes using Google's public handwriting recognition service.
 * Takes the raw stroke coordinates (x, y, timestamp) from pen tablet input
 * and returns accurately recognized lines, words, letters, and numbers.
 */
export async function recognizeStrokesWithGoogle(
  strokes: Stroke[],
  bbox: BoundingBox,
  language: 'en' | 'ta' | 'auto' = 'en'
): Promise<HandwritingCandidate | null> {
  if (!strokes || strokes.length === 0) return null;

  const width = Math.max(100, Math.round(bbox.width + 40));
  const height = Math.max(100, Math.round(bbox.height + 40));

  // Normalize points relative to bounding box origin
  const ink: number[][][] = [];
  const minTime = strokes[0].points[0]?.timestamp || Date.now();

  for (const stroke of strokes) {
    const xs: number[] = [];
    const ys: number[] = [];
    const ts: number[] = [];

    for (const pt of stroke.points) {
      xs.push(Math.round(pt.x - bbox.minX + 20));
      ys.push(Math.round(pt.y - bbox.minY + 20));
      ts.push(Math.max(0, pt.timestamp - minTime));
    }

    if (xs.length > 0) {
      ink.push([xs, ys, ts]);
    }
  }

  if (ink.length === 0) return null;

  const langCode = language === 'ta' ? 'ta' : 'en';

  const payload = {
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: {
          writing_area_width: width,
          writing_area_height: height,
        },
        ink,
        language: langCode,
      },
    ],
  };

  try {
    const res = await fetch(
      'https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    // Data schema: ["SUCCESS", [ [ "requestId", [ "text1", "text2", "text3", ... ] ] ]]
    if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      const candidates: string[] = data[1][0][1];
      if (candidates.length > 0) {
        return {
          text: candidates[0],
          alternatives: candidates.slice(1, 6),
        };
      }
    }
    return null;
  } catch (err) {
    console.warn('Google handwriting recognition request failed:', err);
    return null;
  }
}
