import { Point, ShapeObject, ShapeType } from '../types/ink';
import { computeBoundingBox } from './strokeEngine';

export interface DetectedShape {
  type: ShapeType;
  confidence: number;
  shape: ShapeObject;
}

/**
 * Evaluates hand-drawn stroke points to detect if it matches a geometric primitive
 */
export function detectShapeFromStroke(
  points: Point[],
  strokeColor: string,
  strokeWidth: number
): DetectedShape | null {
  if (points.length < 8) return null;

  const bbox = computeBoundingBox(points, 0);
  if (bbox.width < 15 && bbox.height < 15) return null;

  const pStart = points[0];
  const pEnd = points[points.length - 1];
  const endToStartDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
  const diagonal = Math.hypot(bbox.width, bbox.height);
  const isClosed = endToStartDist < Math.max(24, diagonal * 0.25);

  // 1. Check for straight Line or Arrow
  if (!isClosed) {
    let totalPathLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalPathLength += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    }
    const directDistance = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
    const straightness = directDistance / (totalPathLength || 1);

    if (straightness > 0.88) {
      return {
        type: 'line',
        confidence: straightness,
        shape: {
          id: 'shape_' + Date.now(),
          type: 'line',
          x: pStart.x,
          y: pStart.y,
          width: pEnd.x - pStart.x,
          height: pEnd.y - pStart.y,
          strokeColor,
          strokeWidth,
          fillColor: 'transparent',
          opacity: 1,
          timestamp: Date.now(),
        },
      };
    }
  }

  // 2. Closed shapes: Circle, Ellipse, Rectangle, Triangle
  if (isClosed) {
    const centerX = bbox.minX + bbox.width / 2;
    const centerY = bbox.minY + bbox.height / 2;

    // Radius variance test for circle
    const avgRadius = (bbox.width + bbox.height) / 4;
    let radiusVariance = 0;

    for (const pt of points) {
      const r = Math.hypot(pt.x - centerX, pt.y - centerY);
      radiusVariance += Math.abs(r - avgRadius);
    }
    radiusVariance /= points.length;

    const circularity = 1 - radiusVariance / (avgRadius || 1);
    const aspectRatio = bbox.width / (bbox.height || 1);

    // If circularity is high and aspect ratio is near 1:1 -> Circle
    if (circularity > 0.72 && aspectRatio > 0.75 && aspectRatio < 1.35) {
      return {
        type: 'circle',
        confidence: circularity,
        shape: {
          id: 'shape_' + Date.now(),
          type: 'circle',
          x: bbox.minX,
          y: bbox.minY,
          width: bbox.width,
          height: bbox.height,
          strokeColor,
          strokeWidth,
          fillColor: 'transparent',
          opacity: 1,
          timestamp: Date.now(),
        },
      };
    }

    // Ellipse
    if (circularity > 0.68) {
      return {
        type: 'ellipse',
        confidence: circularity,
        shape: {
          id: 'shape_' + Date.now(),
          type: 'ellipse',
          x: bbox.minX,
          y: bbox.minY,
          width: bbox.width,
          height: bbox.height,
          strokeColor,
          strokeWidth,
          fillColor: 'transparent',
          opacity: 1,
          timestamp: Date.now(),
        },
      };
    }

    // Rectangle check: corner distribution
    return {
      type: 'rectangle',
      confidence: 0.7,
      shape: {
        id: 'shape_' + Date.now(),
        type: 'rectangle',
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
        strokeColor,
        strokeWidth,
        fillColor: 'transparent',
        opacity: 1,
        timestamp: Date.now(),
      },
    };
  }

  return null;
}
