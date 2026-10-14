import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Stroke,
  Point,
  ToolType,
  PenSettings,
  ShapeObject,
  ShapeType,
  PageBackgroundConfig,
  BoundingBox,
  EraserMode,
  TextBlock,
  ChecklistItem,
} from '../../types/ink';
import { LanguageMode } from '../../types/ai';
import {
  computeBoundingBox,
  renderStrokeToContext,
  isStrokeHit,
  isStrokeInLasso,
  stabilizePoints,
} from '../../engine/strokeEngine';
import { renderPageBackground, getPageDimensions } from '../../engine/backgroundRenderer';
import { detectShapeFromStroke, DetectedShape } from '../../engine/shapeDetector';
import { detectScratchOutGesture } from '../../engine/gestureDetector';
import { recognitionEngine } from '../../services/ai/recognitionEngine';
import { QuickSelectionBar } from './QuickSelectionBar';
import { NeboLiveConversionBar } from './NeboLiveConversionBar';
import { EditableTextBlock } from './EditableTextBlock';
import { InkReplayModal } from './InkReplayModal';
import { Sparkles, Check, Trash2, CheckCheck, BoxSelect, RotateCcw } from 'lucide-react';
import { RulerState } from '../../types/ink';

interface NoteCanvasProps {
  strokes: Stroke[];
  shapes: ShapeObject[];
  textBlocks?: TextBlock[];
  checklists?: ChecklistItem[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onShapesChange: (shapes: ShapeObject[]) => void;
  onTextBlocksChange?: (textBlocks: TextBlock[]) => void;
  onChecklistsChange?: (checklists: ChecklistItem[]) => void;
  backgroundConfig: PageBackgroundConfig;
  currentTool: ToolType;
  penSettings: PenSettings;
  eraserMode: EraserMode;
  currentShapeType: ShapeType;
  selectedStrokeIds: string[];
  onSelectStrokes: (ids: string[]) => void;
  onConvertSelection: (selectedStrokes: Stroke[], isMath?: boolean) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  languageMode?: LanguageMode;
  apiKey?: string;
  onClearPage?: () => void;
  rulerState?: RulerState;
  onUpdateRuler?: (ruler: RulerState) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  strokes,
  shapes,
  textBlocks = [],
  checklists = [],
  onStrokesChange,
  onShapesChange,
  onTextBlocksChange,
  onChecklistsChange,
  backgroundConfig,
  currentTool,
  penSettings,
  eraserMode: _eraserMode,
  selectedStrokeIds,
  onSelectStrokes,
  onConvertSelection,
  zoom,
  languageMode = 'auto',
  apiKey,
  onClearPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<Point[]>([]);
  const activePointerIdRef = useRef<number | null>(null);
  const isPenActiveRef = useRef(false);

  // Shape detection suggestion
  const [shapeSuggestion, setShapeSuggestion] = useState<DetectedShape | null>(null);

  // Lasso polygon points
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);

  // Selection bounding box drag / transform state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Nebo Live Recognition State
  const [liveRecognizedText, setLiveRecognizedText] = useState<string>('');
  const [liveMathSolution, setLiveMathSolution] = useState<string | undefined>(undefined);
  const [liveBbox, setLiveBbox] = useState<BoundingBox | null>(null);
  const [isLiveRecognizing, setIsLiveRecognizing] = useState(false);
  const [recentStrokeIds, setRecentStrokeIds] = useState<string[]>([]);
  const recognitionTimeoutRef = useRef<any>(null);

  // Freeform Text Box creation on click
  const [activeEditingTextId, setActiveEditingTextId] = useState<string | null>(null);

  // Box Marquee Selection State
  const [boxSelectStart, setBoxSelectStart] = useState<Point | null>(null);
  const [boxSelectCurrent, setBoxSelectCurrent] = useState<Point | null>(null);

  // Ink Stroke Replay Modal State
  const [replayData, setReplayData] = useState<{
    strokes: Stroke[];
    text?: string;
    title?: string;
  } | null>(null);

  // Undo Handwriting to Text conversion state
  const [lastConvertedUndo, setLastConvertedUndo] = useState<{
    strokes: Stroke[];
    textBlockId: string;
  } | null>(null);

  const { width: pageWidth, height: pageHeight } = getPageDimensions(backgroundConfig.pageSize);

  // Redraw Background Canvas
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, pageWidth, pageHeight);
    renderPageBackground(ctx, backgroundConfig, pageWidth, pageHeight);
  }, [backgroundConfig, pageWidth, pageHeight]);

  // Redraw Main Drawing Canvas
  const redrawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, pageWidth, pageHeight);

    // 1. Draw Shapes
    for (const shape of shapes) {
      ctx.save();
      ctx.strokeStyle = shape.strokeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.fillStyle = shape.fillColor || 'transparent';
      ctx.globalAlpha = shape.opacity || 1;

      if (shape.type === 'rectangle') {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.fillColor !== 'transparent') ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        const r = Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2;
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        if (shape.fillColor !== 'transparent') ctx.fill();
      } else if (shape.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
      } else if (shape.type === 'arrow') {
        const fromX = shape.x;
        const fromY = shape.y;
        const toX = shape.x + shape.width;
        const toY = shape.y + shape.height;
        const headlen = 16;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = shape.strokeColor;
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Draw Vector Strokes
    for (const stroke of strokes) {
      const isSelected = selectedStrokeIds.includes(stroke.id);
      renderStrokeToContext(ctx, stroke);

      // If selected, highlight with glowing outline
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          stroke.bbox.minX - 4,
          stroke.bbox.minY - 4,
          stroke.bbox.width + 8,
          stroke.bbox.height + 8
        );
        ctx.restore();
      }
    }

    // 3. Draw active stroke in real-time
    if (currentPointsRef.current.length > 0) {
      const activeStroke: Stroke = {
        id: 'active_temp',
        points: currentPointsRef.current,
        color: penSettings.color,
        width: penSettings.size,
        opacity: currentTool === 'highlighter' ? 0.35 : penSettings.opacity,
        preset: currentTool === 'highlighter' ? 'highlighter' : penSettings.preset,
        timestamp: Date.now(),
        bbox: computeBoundingBox(currentPointsRef.current),
      };
      renderStrokeToContext(ctx, activeStroke);
    }

    // 4. Draw active Lasso polygon
    if (lassoPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';

      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw active Box Selection rectangle
    if (boxSelectStart && boxSelectCurrent) {
      const bx = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const by = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const bw = Math.abs(boxSelectStart.x - boxSelectCurrent.x);
      const bh = Math.abs(boxSelectStart.y - boxSelectCurrent.y);

      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }
  }, [
    shapes,
    strokes,
    selectedStrokeIds,
    penSettings,
    currentTool,
    lassoPoints,
    boxSelectStart,
    boxSelectCurrent,
    pageWidth,
    pageHeight,
  ]);

  useEffect(() => {
    redrawMainCanvas();
  }, [redrawMainCanvas]);

  // Pointer Events Helpers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5, timestamp: Date.now() };

    const rect = canvas.getBoundingClientRect();
    const scaleX = pageWidth / rect.width;
    const scaleY = pageHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Stylus pressure detection
    let pressure = e.pressure;
    if (e.pointerType !== 'pen' || pressure === 0) {
      pressure = 0.5; // fallback for mouse/touch
    }

    return {
      x,
      y,
      pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      timestamp: Date.now(),
    };
  };

  // Trigger Nebo live debounced handwriting recognition
  const scheduleLiveRecognition = useCallback(
    (targetStrokes: Stroke[]) => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }

      if (targetStrokes.length === 0) return;

      const lastStroke = targetStrokes[targetStrokes.length - 1];
      // Gather strokes that belong to the active writing context
      // Group strokes within 120px vertically or recent strokes so multi-line and formulas like (a+b)power2 are not clipped
      const lineStrokes = targetStrokes.filter(
        (s) => Math.abs(s.bbox.minY - lastStroke.bbox.minY) < 120
      );

      const activeStrokes = lineStrokes.length > 0 ? lineStrokes : targetStrokes.slice(-10);
      if (activeStrokes.length === 0) return;

      const clusterBbox = computeBoundingBox(activeStrokes.flatMap((s) => s.points), 8);
      setLiveBbox(clusterBbox);
      setRecentStrokeIds(activeStrokes.map((s) => s.id));
      setIsLiveRecognizing(true);

      recognitionTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await recognitionEngine.recognizeStrokes(activeStrokes, {
            languageMode,
            apiKey,
          });

          if (res && res.rawText && res.rawText.trim()) {
            setLiveRecognizedText(res.rawText.trim());
            setLiveMathSolution(res.mathSolution ? res.mathSolution.result : undefined);
          }
        } catch (err) {
          console.warn('Live recognition error:', err);
        } finally {
          setIsLiveRecognizing(false);
        }
      }, 420); // 420ms debounce for natural writing flow
    },
    [languageMode, apiKey]
  );

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm Rejection: If active stylus pen is drawing, ignore touch
    if (e.pointerType === 'pen') {
      isPenActiveRef.current = true;
    } else if (isPenActiveRef.current && e.pointerType === 'touch') {
      return;
    }

    const pt = getCanvasCoords(e);

    // Freeform Text insertion tool: create editable block without capturing pointer
    if (currentTool === 'text') {
      const newBlock: TextBlock = {
        id: 'txt_' + Date.now(),
        text: '',
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        fontSize: 18,
        color: penSettings.color,
        timestamp: Date.now(),
      };
      if (onTextBlocksChange) {
        onTextBlocksChange([...textBlocks, newBlock]);
        setActiveEditingTextId(newBlock.id);
      }
      setIsDrawing(false);
      return;
    }

    // Freeform Checklist insertion tool
    if (currentTool === 'checklist') {
      const newCheck: ChecklistItem = {
        id: 'chk_' + Date.now(),
        text: 'New To-do item',
        completed: false,
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        timestamp: Date.now(),
      };
      if (onChecklistsChange) {
        onChecklistsChange([...checklists, newCheck]);
      }
      setIsDrawing(false);
      return;
    }

    // Box Marquee Selection Tool
    if (currentTool === 'box-select') {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.setPointerCapture(e.pointerId);
        activePointerIdRef.current = e.pointerId;
      }
      onSelectStrokes([]);
      setBoxSelectStart(pt);
      setBoxSelectCurrent(pt);
      setIsDrawing(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;

    setIsDrawing(true);
    setShapeSuggestion(null);

    // Eraser mode
    if (currentTool === 'eraser') {
      handleEraserAction(pt.x, pt.y);
      return;
    }

    // Lasso selection mode
    if (currentTool === 'lasso') {
      if (selectedStrokeIds.length > 0) {
        const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
        const selBbox = computeBoundingBox(selectedStrokes.flatMap((s) => s.points));
        if (
          pt.x >= selBbox.minX &&
          pt.x <= selBbox.maxX &&
          pt.y >= selBbox.minY &&
          pt.y <= selBbox.maxY
        ) {
          setIsDraggingSelection(true);
          dragStartRef.current = { x: pt.x, y: pt.y };
          return;
        }
      }

      onSelectStrokes([]);
      setLassoPoints([pt]);
      return;
    }

    // Drawing with Pen or Highlighter
    currentPointsRef.current = [pt];
    redrawMainCanvas();
  };

  // Double Click anywhere on canvas to type note (OneNote style)
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = pageWidth / rect.width;
    const scaleY = pageHeight / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const newBlock: TextBlock = {
      id: 'txt_' + Date.now(),
      text: '',
      x,
      y,
      fontSize: 18,
      color: penSettings.color,
      timestamp: Date.now(),
    };
    if (onTextBlocksChange) {
      onTextBlocksChange([...textBlocks, newBlock]);
      setActiveEditingTextId(newBlock.id);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPenActiveRef.current && e.pointerType === 'touch') return;
    if (!isDrawing) return;

    const pt = getCanvasCoords(e);

    // Box selection dragging
    if (currentTool === 'box-select' && boxSelectStart) {
      setBoxSelectCurrent(pt);
      redrawMainCanvas();
      return;
    }

    // Dragging selection
    if (isDraggingSelection && dragStartRef.current) {
      const dx = pt.x - dragStartRef.current.x;
      const dy = pt.y - dragStartRef.current.y;
      dragStartRef.current = { x: pt.x, y: pt.y };

      const updatedStrokes = strokes.map((s) => {
        if (!selectedStrokeIds.includes(s.id)) return s;
        const shiftedPoints = s.points.map((p) => ({
          ...p,
          x: p.x + dx,
          y: p.y + dy,
        }));
        return {
          ...s,
          points: shiftedPoints,
          bbox: computeBoundingBox(shiftedPoints),
        };
      });
      onStrokesChange(updatedStrokes);
      return;
    }

    // Eraser dragging
    if (currentTool === 'eraser') {
      handleEraserAction(pt.x, pt.y);
      return;
    }

    // Lasso dragging
    if (currentTool === 'lasso') {
      setLassoPoints((prev) => [...prev, pt]);
      return;
    }

    // Adding stroke points
    currentPointsRef.current.push(pt);
    redrawMainCanvas();
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      const canvas = canvasRef.current;
      if (canvas) canvas.releasePointerCapture(e.pointerId);
      activePointerIdRef.current = null;
    }

    if (e.pointerType === 'pen') {
      isPenActiveRef.current = false;
    }

    // Finalize Box Selection
    if (currentTool === 'box-select' && boxSelectStart && boxSelectCurrent) {
      const bx = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const by = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const bw = Math.abs(boxSelectStart.x - boxSelectCurrent.x);
      const bh = Math.abs(boxSelectStart.y - boxSelectCurrent.y);

      if (bw > 6 && bh > 6) {
        const hitIds = strokes
          .filter((s) => {
            const sb = s.bbox;
            return (
              sb.minX < bx + bw &&
              sb.maxX > bx &&
              sb.minY < by + bh &&
              sb.maxY > by
            );
          })
          .map((s) => s.id);
        onSelectStrokes(hitIds);
      } else {
        onSelectStrokes([]);
      }
      setBoxSelectStart(null);
      setBoxSelectCurrent(null);
      setIsDrawing(false);
      redrawMainCanvas();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      dragStartRef.current = null;
      return;
    }

    // Finalize Lasso selection
    if (currentTool === 'lasso') {
      if (lassoPoints.length > 2) {
        const hitIds = strokes.filter((s) => isStrokeInLasso(s, lassoPoints)).map((s) => s.id);
        onSelectStrokes(hitIds);
      }
      setLassoPoints([]);
      return;
    }

    // Finalize Pen Stroke
    if (currentPointsRef.current.length > 0) {
      const smoothed = stabilizePoints(currentPointsRef.current, penSettings.smoothing);
      const newStroke: Stroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        points: smoothed,
        color: penSettings.color,
        width: penSettings.size,
        opacity: currentTool === 'highlighter' ? 0.35 : penSettings.opacity,
        preset: currentTool === 'highlighter' ? 'highlighter' : penSettings.preset,
        isHighlighter: currentTool === 'highlighter',
        timestamp: Date.now(),
        bbox: computeBoundingBox(smoothed),
      };

      // Check Nebo Scratch-out gesture
      const gesture = detectScratchOutGesture(newStroke, strokes);
      if (gesture.type === 'scratch' || gesture.type === 'strikethrough') {
        // Erase the target struck-out strokes
        const remaining = strokes.filter((s) => !gesture.targetStrokeIds.includes(s.id));
        onStrokesChange(remaining);
        currentPointsRef.current = [];
        setLiveRecognizedText('');
        setLiveBbox(null);
        return;
      }

      const nextStrokes = [...strokes, newStroke];
      onStrokesChange(nextStrokes);
      currentPointsRef.current = [];

      // Check for rough shape recognition candidate (clean line feature removed as requested)
      const detected = detectShapeFromStroke(smoothed, penSettings.color, penSettings.size);
      if (detected && detected.type !== 'line') {
        setShapeSuggestion(detected);
        setTimeout(() => setShapeSuggestion((prev) => (prev === detected ? null : prev)), 5000);
      }

      // Schedule Nebo Live Handwriting Recognition for pen / stylus strokes
      if (currentTool === 'pen') {
        scheduleLiveRecognition(nextStrokes);
      }
    }
  };

  // Eraser logic
  const handleEraserAction = (x: number, y: number) => {
    const radius = 16;
    const remaining = strokes.filter((s) => !isStrokeHit(s, x, y, radius));
    if (remaining.length !== strokes.length) {
      onStrokesChange(remaining);
    }
  };

  // Convert suggested rough shape to perfect geometric shape
  const handleAcceptShape = () => {
    if (!shapeSuggestion) return;
    const remainingStrokes = strokes.slice(0, -1);
    onStrokesChange(remainingStrokes);
    onShapesChange([...shapes, shapeSuggestion.shape]);
    setShapeSuggestion(null);
  };

  // Select All on current page
  const handleSelectAll = () => {
    onSelectStrokes(strokes.map((s) => s.id));
  };

  // Delete Selected items on page
  const handleDeleteSelected = () => {
    if (selectedStrokeIds.length > 0) {
      onStrokesChange(strokes.filter((s) => !selectedStrokeIds.includes(s.id)));
      onSelectStrokes([]);
    }
  };

  // Clear all items on current page
  const handleClearPage = () => {
    if (onClearPage) {
      onClearPage();
    } else {
      if (strokes.length > 0 || textBlocks.length > 0 || checklists.length > 0 || shapes.length > 0) {
        if (window.confirm('Clear all handwriting, text, and checklists on this page?')) {
          onStrokesChange([]);
          onShapesChange([]);
          if (onTextBlocksChange) onTextBlocksChange([]);
          if (onChecklistsChange) onChecklistsChange([]);
          onSelectStrokes([]);
        }
      }
    }
  };

  // Convert handwritten strokes to clean TextBlock in place (Replace Line with Text)
  const handleConvertLiveText = (customText?: string) => {
    const textToUse = customText || liveRecognizedText;
    if (!textToUse || !liveBbox) return;

    const strokesToReplace = strokes.filter((s) => recentStrokeIds.includes(s.id));
    const remainingStrokes = strokes.filter((s) => !recentStrokeIds.includes(s.id));
    onStrokesChange(remainingStrokes);

    // Create typed TextBlock at that exact spot
    const newTextBlock: TextBlock = {
      id: 'tb_' + Date.now(),
      text: textToUse,
      x: liveBbox.minX,
      y: liveBbox.minY,
      fontSize: Math.max(16, Math.min(28, Math.round(liveBbox.height * 0.75))),
      color: penSettings.color,
      isMath: !!liveMathSolution,
      timestamp: Date.now(),
    };

    if (onTextBlocksChange) {
      onTextBlocksChange([...textBlocks, newTextBlock]);
    }

    // Save for undo / revert
    setLastConvertedUndo({
      strokes: strokesToReplace,
      textBlockId: newTextBlock.id,
    });

    // Dismiss live bar
    setLiveRecognizedText('');
    setLiveMathSolution(undefined);
    setLiveBbox(null);
    setRecentStrokeIds([]);
  };

  // Revert converted text back to original handwriting strokes
  const handleRevertConversion = () => {
    if (!lastConvertedUndo) return;
    onStrokesChange([...strokes, ...lastConvertedUndo.strokes]);
    if (onTextBlocksChange) {
      onTextBlocksChange(textBlocks.filter((b) => b.id !== lastConvertedUndo.textBlockId));
    }
    setLastConvertedUndo(null);
  };

  // Convert live handwritten strokes to Checklist item
  const handleConvertLiveTodo = () => {
    if (!liveRecognizedText || !liveBbox) return;

    const remainingStrokes = strokes.filter((s) => !recentStrokeIds.includes(s.id));
    onStrokesChange(remainingStrokes);

    const newTodo: ChecklistItem = {
      id: 'chk_' + Date.now(),
      text: liveRecognizedText,
      completed: false,
      x: liveBbox.minX,
      y: liveBbox.minY,
      timestamp: Date.now(),
    };

    if (onChecklistsChange) {
      onChecklistsChange([...checklists, newTodo]);
    }

    setLiveRecognizedText('');
    setLiveMathSolution(undefined);
    setLiveBbox(null);
    setRecentStrokeIds([]);
  };

  // Force Full Text conversion: converts all handwriting on the current page directly into typed text
  const handleForceFullTextConversion = async () => {
    if (strokes.length === 0) return;
    setIsLiveRecognizing(true);
    try {
      const res = await recognitionEngine.recognizeStrokes(strokes, {
        languageMode,
        apiKey,
      });
      if (res && res.rawText && res.rawText.trim()) {
        const fullBbox = computeBoundingBox(strokes.flatMap((s) => s.points), 8);
        const textToUse = res.mathSolution
          ? `${res.rawText.trim()} => ${res.mathSolution.result}`
          : res.rawText.trim();

        const newTextBlock: TextBlock = {
          id: 'tb_' + Date.now(),
          text: textToUse,
          x: Math.max(16, fullBbox.minX),
          y: Math.max(16, fullBbox.minY),
          fontSize: 18,
          color: penSettings.color,
          isMath: !!res.mathSolution,
          timestamp: Date.now(),
        };

        const prevStrokes = [...strokes];
        onStrokesChange([]);
        if (onTextBlocksChange) {
          onTextBlocksChange([...textBlocks, newTextBlock]);
        }
        setLastConvertedUndo({
          strokes: prevStrokes,
          textBlockId: newTextBlock.id,
        });
        setLiveRecognizedText('');
        setLiveMathSolution(undefined);
        setLiveBbox(null);
        setRecentStrokeIds([]);
      }
    } catch (err) {
      console.warn('Force full text recognition error:', err);
    } finally {
      setIsLiveRecognizing(false);
    }
  };

  // Selected bounding box for Lasso action bar
  const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
  const selectionBbox: BoundingBox | null =
    selectedStrokes.length > 0
      ? computeBoundingBox(selectedStrokes.flatMap((s) => s.points), 8)
      : null;

  return (
    <div className="canvas-viewport">
      <div
        className="canvas-wrapper"
        style={{
          width: pageWidth,
          height: pageHeight,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          position: 'relative',
        }}
      >
        {/* Background Canvas Layer */}
        <canvas
          ref={bgCanvasRef}
          width={pageWidth}
          height={pageHeight}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />

        {/* Freeform Typed Text Blocks Layer (OneNote style) */}
        {textBlocks.map((block) => (
          <EditableTextBlock
            key={block.id}
            block={block}
            isEditing={activeEditingTextId === block.id}
            onStartEditing={() => setActiveEditingTextId(block.id)}
            onSave={(updated) => {
              if (onTextBlocksChange) {
                onTextBlocksChange(textBlocks.map((b) => (b.id === updated.id ? updated : b)));
              }
              setActiveEditingTextId(null);
            }}
            onDelete={(id) => {
              if (onTextBlocksChange) {
                onTextBlocksChange(textBlocks.filter((b) => b.id !== id));
              }
              if (activeEditingTextId === id) setActiveEditingTextId(null);
            }}
          />
        ))}

        {/* Freeform Checklists Layer (OneNote & Google Keep style) */}
        {checklists.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: item.y || 100,
              left: item.x || 100,
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
            }}
            onClick={() => {
              if (onChecklistsChange) {
                onChecklistsChange(
                  checklists.map((c) => (c.id === item.id ? { ...c, completed: !c.completed } : c))
                );
              }
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: item.completed ? 'none' : '1.5px solid var(--accent-primary)',
                background: item.completed ? 'var(--accent-primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.completed && <Check size={11} color="white" />}
            </div>
            <span
              style={{
                fontSize: 14,
                textDecoration: item.completed ? 'line-through' : 'none',
                color: item.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
              }}
            >
              {item.text}
            </span>
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                if (onChecklistsChange) onChecklistsChange(checklists.filter((c) => c.id !== item.id));
              }}
              style={{ width: 18, height: 18, padding: 0, marginLeft: 4, opacity: 0.6 }}
              title="Delete to-do item"
            >
              <Trash2 size={11} color="#ef4444" />
            </button>
          </div>
        ))}

        {/* Interactive Ink Canvas Layer */}
        <canvas
          ref={canvasRef}
          width={pageWidth}
          height={pageHeight}
          className="drawing-canvas"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 15 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Nebo Live Handwriting Conversion Preview Bar */}
        {liveBbox && (liveRecognizedText || isLiveRecognizing) && (
          <NeboLiveConversionBar
            bbox={liveBbox}
            pageWidth={pageWidth}
            recognizedText={liveRecognizedText}
            mathSolution={liveMathSolution}
            isRecognizing={isLiveRecognizing}
            onConvertToText={(textToUse) => handleConvertLiveText(textToUse)}
            onConvertToMath={
              liveMathSolution
                ? () => handleConvertLiveText(`${liveRecognizedText} => ${liveMathSolution}`)
                : undefined
            }
            onConvertToTodo={handleConvertLiveTodo}
            onForceFullText={handleForceFullTextConversion}
            onReplayLine={() => {
              const lineStrokes = strokes.filter((s) => recentStrokeIds.includes(s.id));
              setReplayData({
                strokes: lineStrokes.length > 0 ? lineStrokes : strokes.slice(-4),
                text: liveRecognizedText,
                title: 'Replay Drawn Line',
              });
            }}
            onDismiss={() => {
              setLiveBbox(null);
              setLiveRecognizedText('');
              setLiveMathSolution(undefined);
            }}
          />
        )}

        {/* Shape Conversion Suggestion Pill */}
        {shapeSuggestion && shapeSuggestion.type !== 'line' && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: Math.max(12, shapeSuggestion.shape.y - 48),
              left: Math.max(12, shapeSuggestion.shape.x),
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn 150ms ease-out',
            }}
          >
            <Sparkles size={15} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Convert to clean {shapeSuggestion.type}?
            </span>
            <button
              className="btn-pill btn-primary"
              style={{ padding: '2px 10px', fontSize: 11 }}
              onClick={handleAcceptShape}
            >
              Convert
            </button>
            <button
              className="btn-icon"
              style={{ width: 22, height: 22 }}
              onClick={() => setShapeSuggestion(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Quick Selection Floating Actions Bar */}
        {selectionBbox && (
          <QuickSelectionBar
            bbox={selectionBbox}
            selectedStrokes={selectedStrokes}
            onConvertText={() => onConvertSelection(selectedStrokes, false)}
            onConvertMath={() => onConvertSelection(selectedStrokes, true)}
            onAutoCorrect={() => onConvertSelection(selectedStrokes, false)}
            onCopyText={() => {
              navigator.clipboard.writeText('Copied handwriting selection');
            }}
            onReplay={() => {
              setReplayData({
                strokes: selectedStrokes,
                title: `Replay Selection (${selectedStrokes.length} Strokes)`,
              });
            }}
            onDelete={handleDeleteSelected}
            onSelectAll={handleSelectAll}
            onDeselectAll={() => onSelectStrokes([])}
          />
        )}
      </div>

      {/* Floating Canvas Action Dock (Select All, Delete, Clear Page) */}
      <div
        className="canvas-action-dock glass-panel"
        style={{
          position: 'fixed',
          bottom: 18,
          right: 24,
          zIndex: 35,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-md)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <button
          className="btn-pill"
          style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleSelectAll}
          title="Select All items on page (Ctrl+A)"
        >
          <CheckCheck size={13} /> Select All
        </button>

        {selectedStrokeIds.length > 0 && (
          <button
            className="btn-pill"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
            }}
            onClick={handleDeleteSelected}
            title="Delete Selected items (Del)"
          >
            <Trash2 size={13} /> Delete Selected ({selectedStrokeIds.length})
          </button>
        )}

        <button
          className="btn-pill"
          style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}
          onClick={handleClearPage}
          title="Clear all ink, text, and checklists on this page"
        >
          <Trash2 size={13} /> Clear Page
        </button>
      </div>

      {/* Revert / Undo Conversion Floating Banner */}
      {lastConvertedUndo && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-primary)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 180ms ease-out',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Handwriting converted to text.
          </span>
          <button
            className="btn-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: 'rgba(37,99,235,0.1)',
              color: 'var(--accent-primary)',
            }}
            onClick={handleRevertConversion}
            title="Revert back to original drawn ink"
          >
            <RotateCcw size={13} /> Revert to Ink
          </button>
          <button
            className="btn-icon"
            style={{ width: 22, height: 22, padding: 0 }}
            onClick={() => setLastConvertedUndo(null)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Ink Stroke Replay Modal */}
      {replayData && (
        <InkReplayModal
          isOpen={true}
          onClose={() => setReplayData(null)}
          strokes={replayData.strokes}
          recognizedText={replayData.text}
          title={replayData.title}
        />
      )}
    </div>
  );
};
