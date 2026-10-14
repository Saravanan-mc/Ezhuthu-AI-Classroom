export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  timestamp: number;
}

export type PenPreset = 'normal' | 'fine' | 'marker' | 'highlighter' | 'pencil' | 'brush';

export type EraserMode = 'stroke' | 'partial' | 'object' | 'area';

export type AppMode = 'note' | 'keep' | 'whiteboard';

export type NeboGestureType = 'scratch' | 'strikethrough' | 'convert' | 'split';

export type RecognitionTriggerMode = 'smart' | 'manual' | 'instant';

export type ContentType =
  | 'heading'
  | 'paragraph'
  | 'bullet-list'
  | 'number'
  | 'equation'
  | 'diagram-label'
  | 'general-text';

export type ToolType =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'lasso'
  | 'box-select'
  | 'text'
  | 'checklist'
  | 'shape'
  | 'ruler'
  | 'pan';

export interface RulerState {
  visible: boolean;
  x: number;
  y: number;
  length: number;
  angle: number; // degrees
}

export type ShapeType =
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  | 'star'
  | 'callout';

export interface PenSettings {
  preset: PenPreset;
  size: number;
  color: string;
  opacity: number;
  smoothing: number; // 0 to 1
  pressureEnabled: boolean;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  preset: PenPreset;
  isHighlighter?: boolean;
  timestamp: number;
  bbox: BoundingBox;
}

export interface ShapeObject {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
  rotation?: number;
  text?: string;
  timestamp: number;
}

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  fontSize: number;
  color: string;
  fontWeight?: 'normal' | 'bold';
  isMath?: boolean;
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color: string; // One of Google Keep palette colors
  isPinned: boolean;
  tags: string[];
  checklists?: { id: string; text: string; completed: boolean }[];
  strokes?: Stroke[];
  createdAt: number;
  updatedAt: number;
}

export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  timestamp: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type PageBackgroundType =
  | 'blank'
  | 'ruled'
  | 'narrow-ruled'
  | 'wide-ruled'
  | 'grid'
  | 'large-grid'
  | 'dotted'
  | 'cornell'
  | 'tamil-guide'
  | 'custom';

export type PageSizeType = 'a4' | 'a5' | 'letter' | 'infinite' | 'custom';

export interface PageBackgroundConfig {
  type: PageBackgroundType;
  paperColor: string;
  lineColor: string;
  lineSpacing: number; // pixels
  gridSize: number; // pixels
  margin: number; // pixels
  pageSize: PageSizeType;
  customWidth?: number;
  customHeight?: number;
  showTamilGuideRulers?: boolean;
}
