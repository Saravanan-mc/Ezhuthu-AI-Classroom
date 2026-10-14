import { Point, Stroke, BoundingBox, PenPreset } from '../types/ink';

/**
 * Calculates the bounding box of a list of points
 */
export function computeBoundingBox(points: Point[], padding = 4): BoundingBox {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: Math.max(0, maxX - minX + padding * 2),
    height: Math.max(0, maxY - minY + padding * 2),
  };
}

/**
 * Smooths raw tablet points using an exponential moving average
 */
export function stabilizePoints(points: Point[], weight = 0.35): Point[] {
  if (points.length <= 2) return points;

  const smoothed: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = smoothed[i - 1];
    const curr = points[i];

    smoothed.push({
      x: prev.x * weight + curr.x * (1 - weight),
      y: prev.y * weight + curr.y * (1 - weight),
      pressure: prev.pressure * weight + curr.pressure * (1 - weight),
      tiltX: curr.tiltX,
      tiltY: curr.tiltY,
      timestamp: curr.timestamp,
    });
  }

  return smoothed;
}

/**
 * Calculates dynamic stroke width from pressure and pen preset
 */
export function calculateStrokeWidth(
  baseSize: number,
  pressure: number,
  preset: PenPreset,
  pressureEnabled: boolean
): number {
  if (!pressureEnabled) return baseSize;

  // Pressure usually normalized 0 to 1
  const p = Math.max(0.05, Math.min(1, pressure || 0.5));

  switch (preset) {
    case 'fine':
      return Math.max(1, baseSize * (0.5 + p * 0.7));
    case 'marker':
      return Math.max(2, baseSize * (0.6 + p * 0.9));
    case 'highlighter':
      return baseSize; // uniform width for highlighting
    case 'pencil':
      return Math.max(0.8, baseSize * (0.4 + p * 0.8));
    case 'brush':
      return Math.max(1.5, baseSize * (0.2 + p * 1.6));
    case 'normal':
    default:
      return Math.max(1, baseSize * (0.4 + p * 0.9));
  }
}

/**
 * Renders a single stroke onto a CanvasRenderingContext2D using smooth bezier curves
 */
export function renderStrokeToContext(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale = 1
): void {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return;

  ctx.save();

  if (stroke.preset === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
  } else if (stroke.preset === 'pencil') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0.5;
    ctx.shadowColor = stroke.color;
  } else {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.globalAlpha = stroke.opacity;

  if (pts.length === 1) {
    const p = pts[0];
    const r = (calculateStrokeWidth(stroke.width, p.pressure, stroke.preset, true) / 2) * scale;
    ctx.beginPath();
    ctx.arc(p.x * scale, p.y * scale, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw segments with variable width Catmull-Rom / Quadratic Bezier curves
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const w = calculateStrokeWidth(stroke.width, (p0.pressure + p1.pressure) / 2, stroke.preset, true) * scale;

    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p0.x * scale, p0.y * scale);

    if (i < pts.length - 2) {
      const p2 = pts[i + 2];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x * scale, p1.y * scale, midX * scale, midY * scale);
    } else {
      ctx.lineTo(p1.x * scale, p1.y * scale);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Distance from point (px, py) to line segment (x1, y1) - (x2, y2)
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const diffX = px - projX;
  const diffY = py - projY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * Check if a point hits any part of a stroke within a radius
 */
export function isStrokeHit(stroke: Stroke, x: number, y: number, radius = 8): boolean {
  // Quick bbox pre-check
  const bbox = stroke.bbox;
  if (
    x < bbox.minX - radius ||
    x > bbox.maxX + radius ||
    y < bbox.minY - radius ||
    y > bbox.maxY + radius
  ) {
    return false;
  }

  const pts = stroke.points;
  if (pts.length === 1) {
    const d = Math.hypot(pts[0].x - x, pts[0].y - y);
    return d <= radius + stroke.width / 2;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const dist = pointToSegmentDistance(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (dist <= radius + stroke.width / 2) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a stroke is completely or partially inside a selection polygon or rectangle
 */
export function isStrokeInsideRect(stroke: Stroke, rect: BoundingBox): boolean {
  const bbox = stroke.bbox;
  return !(
    bbox.maxX < rect.minX ||
    bbox.minX > rect.maxX ||
    bbox.maxY < rect.minY ||
    bbox.minY > rect.maxY
  );
}

/**
 * Point-in-polygon test for freeform lasso selection
 */
export function isPointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a stroke is selected by a lasso polygon
 */
export function isStrokeInLasso(stroke: Stroke, lassoPoints: Point[]): boolean {
  if (lassoPoints.length < 3) return false;

  // If bounding box doesn't overlap at all, skip
  const lassoBbox = computeBoundingBox(lassoPoints);
  if (!isStrokeInsideRect(stroke, lassoBbox)) return false;

  // Check if at least 40% of stroke points fall inside the lasso polygon
  let insideCount = 0;
  for (const pt of stroke.points) {
    if (isPointInPolygon(pt.x, pt.y, lassoPoints)) {
      insideCount++;
    }
  }

  return insideCount > 0 && insideCount >= stroke.points.length * 0.35;
}
