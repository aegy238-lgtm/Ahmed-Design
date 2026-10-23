import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { EditableLayer, SVGAProjectData, CanvasTool, GuideLine, FadeConfig, CropConfig, CropFeather, ShineVectorPoint } from './types';
import { getLayerAnimatedTransform } from './motionEngine';
import { applyTransparencyEffects } from './transparencyEngine';
import { renderLayerShine } from './shineEngine';
import { 
  ZoomIn, ZoomOut, RefreshCw, Maximize2, 
  Grid, Compass, Eye, Shield, RotateCcw,
  Focus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Move, Crosshair, Scaling, Check, Lock, Unlock, X, Sliders, Pipette,
  PenTool, Brush, Lasso, Square, Circle, Eraser, Scissors, Trash2
} from 'lucide-react';
import { ChromaTargetColor, rgbToHex, identifyColorType, PenMaskStroke } from './svgaSmartChromaEngine';

interface SvgaDesignCanvasProps {
  project: SVGAProjectData;
  layers: EditableLayer[];
  selectedLayerId: string | null;
  selectedLayerIds?: string[];
  currentFrame: number;
  activeTool: CanvasTool;
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  bgColor: string;
  onSelectLayer: (layerId: string | null, isMulti?: boolean) => void;
  onUpdateLayerTransform: (layerId: string, transform: Partial<EditableLayer['transform']>) => void;
  onBulkUpdateTransforms?: (updates: Array<{ id: string; transform: Partial<EditableLayer['transform']> }>) => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (offset: { x: number; y: number }) => void;
  onDeleteLayer?: (layerId: string) => void;
  onUpdateProjectDimensions?: (width: number, height: number, scaleLayers?: boolean) => void;
  onChromaPickColor?: (color: ChromaTargetColor) => void;
  onChromaHoverColor?: (color: ChromaTargetColor | null) => void;
  onUpdateShineConfig?: (layerId: string, shineDelta: any, targetScope?: any) => void;
  fadeConfig?: FadeConfig;
  cropConfig?: CropConfig;
  cropFeather?: CropFeather;
  bgImageUrl?: string | null;
  shinePointStep?: 'idle' | 'place-start' | 'place-end';
  onShinePointStepChange?: (step: 'idle' | 'place-start' | 'place-end') => void;
  onDragEnd?: () => void;
  onPausePlayback?: () => void;

  // Freehand Pen Mask & Cutout Props
  isChromaPenActive?: boolean;
  chromaSubMode?: 'picker' | 'pen-mask' | 'mask-draw';
  chromaPenTool?: 'brush' | 'lasso' | 'rect' | 'circle';
  chromaMaskMode?: 'erase' | 'keep';
  chromaBrushSize?: number;
  chromaPenFeather?: number;
  chromaPenOpacity?: number;
  penStrokes?: PenMaskStroke[];
  onAddPenStroke?: (stroke: PenMaskStroke) => void;
  onClearPenStrokes?: () => void;
  onUndoPenStroke?: () => void;
  onApplyPenMask?: () => void;
  onPenToolChange?: (tool: 'brush' | 'lasso' | 'rect' | 'circle') => void;
  onMaskModeChange?: (mode: 'erase' | 'keep') => void;
  onBrushSizeChange?: (size: number) => void;
}

type DragHandleType = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rot' | 'pan' | 'shine-start' | 'shine-end' | 'shine-mid';

interface Point {
  x: number;
  y: number;
}

// Matrix multiplication: M1 * M2
// [a1 c1 tx1] * [a2 c2 tx2]
// [b1 d1 ty1]   [b2 d2 ty2]
function multiplyMatrices(
  m1: [number, number, number, number, number, number],
  m2: [number, number, number, number, number, number]
): [number, number, number, number, number, number] {
  const [a1, b1, c1, d1, tx1, ty1] = m1;
  const [a2, b2, c2, d2, tx2, ty2] = m2;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1
  ];
}

// Transform point with affine matrix [a, b, c, d, tx, ty]
function transformPoint(m: [number, number, number, number, number, number], x: number, y: number): Point {
  return {
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5]
  };
}

// Helper to parse color channels safely (supports 0..1 floats and 0..255 ints)
function parseColorChan(v: any): number {
  const n = parseFloat(v) || 0;
  return n > 1 ? Math.min(255, Math.max(0, Math.round(n))) : Math.min(255, Math.max(0, Math.round(n * 255)));
}

// Helper to map SVGA / AE blend modes to canvas globalCompositeOperation
function mapBlendMode(raw: any): GlobalCompositeOperation | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  switch (s) {
    case 'screen':
    case '2':
      return 'screen';
    case 'add':
    case 'lighter':
    case 'plus':
    case 'plus-lighter':
    case 'linear-dodge':
    case '16':
      return 'lighter';
    case 'multiply':
    case '1':
      return 'multiply';
    case 'overlay':
    case '3':
      return 'overlay';
    case 'darken':
    case '4':
      return 'darken';
    case 'lighten':
    case '5':
      return 'lighten';
    case 'color-dodge':
    case '6':
      return 'color-dodge';
    case 'color-burn':
    case '7':
      return 'color-burn';
    case 'hard-light':
    case '8':
      return 'hard-light';
    case 'soft-light':
    case '9':
      return 'soft-light';
    case 'difference':
    case '10':
      return 'difference';
    case 'exclusion':
    case '11':
      return 'exclusion';
    case 'hue':
    case '12':
      return 'hue';
    case 'saturation':
    case '13':
      return 'saturation';
    case 'color':
    case '14':
      return 'color';
    case 'luminosity':
    case '15':
      return 'luminosity';
    default:
      return null;
  }
}

// Robust SVG path parser matching SVGA 2.0 standards
function applySvgPathToContext(ctx: CanvasRenderingContext2D, pathStr: string): boolean {
  if (!pathStr || typeof pathStr !== 'string') return false;
  const str = pathStr.trim();
  if (!str) return false;

  // 1. Try native Path2D first
  try {
    const p = new Path2D(str);
    ctx.clip(p);
    return true;
  } catch (e) {
    // Fallback to manual parser below
  }

  // 2. Parser fallback for concatenated/comma numbers in SVGA
  try {
    ctx.beginPath();
    const segments = str
      .replace(/([a-zA-Z])/g, '|||$1 ')
      .replace(/,/g, ' ')
      .split('|||');

    let curX = 0;
    let curY = 0;

    for (const seg of segments) {
      if (!seg) continue;
      const trimmed = seg.trim();
      if (!trimmed) continue;
      const cmd = trimmed.charAt(0);
      const args = trimmed.slice(1).trim().split(/\s+/).map(Number).filter(n => !isNaN(n));

      switch (cmd) {
        case 'M':
          curX = args[0] || 0;
          curY = args[1] || 0;
          ctx.moveTo(curX, curY);
          break;
        case 'm':
          curX += args[0] || 0;
          curY += args[1] || 0;
          ctx.moveTo(curX, curY);
          break;
        case 'L':
          curX = args[0] || 0;
          curY = args[1] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'l':
          curX += args[0] || 0;
          curY += args[1] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'H':
          curX = args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'h':
          curX += args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'V':
          curY = args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'v':
          curY += args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'C':
          ctx.bezierCurveTo(args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0, args[4] || 0, args[5] || 0);
          curX = args[4] || 0;
          curY = args[5] || 0;
          break;
        case 'c':
          ctx.bezierCurveTo(curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0), curX + (args[4] || 0), curY + (args[5] || 0));
          curX += args[4] || 0;
          curY += args[5] || 0;
          break;
        case 'S':
          ctx.bezierCurveTo(curX, curY, args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0);
          curX = args[2] || 0;
          curY = args[3] || 0;
          break;
        case 's':
          ctx.bezierCurveTo(curX, curY, curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0));
          curX += args[2] || 0;
          curY += args[3] || 0;
          break;
        case 'Q':
          ctx.quadraticCurveTo(args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0);
          curX = args[2] || 0;
          curY = args[3] || 0;
          break;
        case 'q':
          ctx.quadraticCurveTo(curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0));
          curX += args[2] || 0;
          curY += args[3] || 0;
          break;
        case 'Z':
        case 'z':
          ctx.closePath();
          break;
      }
    }
    ctx.clip();
    return true;
  } catch (err) {
    return false;
  }
}

// Trace path for drawing/filling shapes without clipping context
function traceSvgPathToContext(ctx: CanvasRenderingContext2D, pathStr: string): boolean {
  if (!pathStr || typeof pathStr !== 'string') return false;
  const str = pathStr.trim();
  if (!str) return false;

  try {
    ctx.beginPath();
    const segments = str
      .replace(/([a-zA-Z])/g, '|||$1 ')
      .replace(/,/g, ' ')
      .split('|||');

    let curX = 0;
    let curY = 0;

    for (const seg of segments) {
      if (!seg) continue;
      const trimmed = seg.trim();
      if (!trimmed) continue;
      const cmd = trimmed.charAt(0);
      const args = trimmed.slice(1).trim().split(/\s+/).map(Number).filter(n => !isNaN(n));

      switch (cmd) {
        case 'M':
          curX = args[0] || 0;
          curY = args[1] || 0;
          ctx.moveTo(curX, curY);
          break;
        case 'm':
          curX += args[0] || 0;
          curY += args[1] || 0;
          ctx.moveTo(curX, curY);
          break;
        case 'L':
          curX = args[0] || 0;
          curY = args[1] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'l':
          curX += args[0] || 0;
          curY += args[1] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'H':
          curX = args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'h':
          curX += args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'V':
          curY = args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'v':
          curY += args[0] || 0;
          ctx.lineTo(curX, curY);
          break;
        case 'C':
          ctx.bezierCurveTo(args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0, args[4] || 0, args[5] || 0);
          curX = args[4] || 0;
          curY = args[5] || 0;
          break;
        case 'c':
          ctx.bezierCurveTo(curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0), curX + (args[4] || 0), curY + (args[5] || 0));
          curX += args[4] || 0;
          curY += args[5] || 0;
          break;
        case 'S':
          ctx.quadraticCurveTo(args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0);
          curX = args[2] || 0;
          curY = args[3] || 0;
          break;
        case 's':
          ctx.quadraticCurveTo(curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0));
          curX += args[2] || 0;
          curY += args[3] || 0;
          break;
        case 'Q':
          ctx.quadraticCurveTo(args[0] || 0, args[1] || 0, args[2] || 0, args[3] || 0);
          curX = args[2] || 0;
          curY = args[3] || 0;
          break;
        case 'q':
          ctx.quadraticCurveTo(curX + (args[0] || 0), curY + (args[1] || 0), curX + (args[2] || 0), curY + (args[3] || 0));
          curX += args[2] || 0;
          curY += args[3] || 0;
          break;
        case 'Z':
        case 'z':
          ctx.closePath();
          break;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

// Helper to render SVGA vector shapes if present
function renderSvgaShapes(ctx: CanvasRenderingContext2D, shapes: any[]) {
  if (!shapes || !Array.isArray(shapes)) return;

  for (const shape of shapes) {
    if (!shape) continue;
    if (shape.type === 3 || shape.type === 'keep') continue;
    ctx.save();

    if (shape.transform) {
      const { a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0 } = shape.transform;
      ctx.transform(a, b, c, d, tx, ty);
    }

    const styles = shape.styles || {};
    if (styles.fill) {
      const { r = 0, g = 0, b = 0, a = 1 } = styles.fill;
      const alpha = typeof a === 'number' ? Math.max(0, Math.min(1, a)) : 1;
      ctx.fillStyle = `rgba(${parseColorChan(r)}, ${parseColorChan(g)}, ${parseColorChan(b)}, ${alpha})`;
    }
    if (styles.stroke) {
      const { r = 0, g = 0, b = 0, a = 1 } = styles.stroke;
      const alpha = typeof a === 'number' ? Math.max(0, Math.min(1, a)) : 1;
      ctx.strokeStyle = `rgba(${parseColorChan(r)}, ${parseColorChan(g)}, ${parseColorChan(b)}, ${alpha})`;
      ctx.lineWidth = styles.strokeWidth || 1;
      if (styles.lineCap) ctx.lineCap = styles.lineCap.toLowerCase();
      if (styles.lineJoin) ctx.lineJoin = styles.lineJoin.toLowerCase();
      if (styles.miterLimit) ctx.miterLimit = styles.miterLimit;
      if (styles.lineDash && Array.isArray(styles.lineDash)) {
        try { ctx.setLineDash(styles.lineDash); } catch (e) {}
      }
    }

    const pathD = shape.shape?.d || shape.args?.d || shape.pathArgs?.d;
    if (pathD) {
      let drawn = false;
      try {
        const p = new Path2D(pathD);
        if (styles.fill) ctx.fill(p);
        if (styles.stroke) ctx.stroke(p);
        drawn = true;
      } catch (e) {
        drawn = false;
      }
      if (!drawn) {
        traceSvgPathToContext(ctx, pathD);
        if (styles.fill) ctx.fill();
        if (styles.stroke) ctx.stroke();
      }
    } else if (shape.rect || (shape.type === 1 && shape.args)) {
      const rObj = shape.rect || shape.args || {};
      const { x = 0, y = 0, width = 0, height = 0, cornerRadius = 0, rx = 0 } = rObj;
      const radius = cornerRadius || rx || 0;
      if (radius > 0 && ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        if (styles.fill) ctx.fill();
        if (styles.stroke) ctx.stroke();
      } else {
        if (styles.fill) ctx.fillRect(x, y, width, height);
        if (styles.stroke) ctx.strokeRect(x, y, width, height);
      }
    } else if (shape.ellipse || (shape.type === 2 && shape.args)) {
      const eObj = shape.ellipse || shape.args || {};
      const { x = 0, y = 0, radiusX = 0, radiusY = 0 } = eObj;
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.1, radiusX), Math.max(0.1, radiusY), 0, 0, Math.PI * 2);
      if (styles.fill) ctx.fill();
      if (styles.stroke) ctx.stroke();
    }

    ctx.restore();
  }
}

export const SvgaDesignCanvas: React.FC<SvgaDesignCanvasProps> = ({
  project,
  layers,
  selectedLayerId,
  selectedLayerIds = [],
  currentFrame,
  activeTool,
  zoom,
  panOffset,
  showGrid,
  showRulers,
  showGuides,
  bgColor,
  onSelectLayer,
  onUpdateLayerTransform,
  onBulkUpdateTransforms,
  onZoomChange,
  onPanChange,
  onDeleteLayer,
  onUpdateProjectDimensions,
  onChromaPickColor,
  onChromaHoverColor,
  onUpdateShineConfig,
  fadeConfig,
  cropConfig,
  cropFeather,
  bgImageUrl,
  shinePointStep: externalShinePointStep,
  onShinePointStepChange,
  onDragEnd,
  onPausePlayback,
  isChromaPenActive = false,
  chromaSubMode = 'pen-mask',
  chromaPenTool = 'brush',
  chromaMaskMode = 'erase',
  chromaBrushSize = 30,
  chromaPenFeather = 8,
  chromaPenOpacity = 100,
  penStrokes = [],
  onAddPenStroke,
  onClearPenStrokes,
  onUndoPenStroke,
  onApplyPenMask,
  onPenToolChange,
  onMaskModeChange,
  onBrushSizeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layersCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const imagesCache = useRef<Record<string, HTMLImageElement>>({});

  // Freehand Pen Mask Drawing State
  const [isDrawingPen, setIsDrawingPen] = useState<boolean>(false);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Point[]>([]);
  const isDrawingPenRef = useRef<boolean>(false);
  const currentDrawingPointsRef = useRef<Point[]>([]);

  // Smart Chroma Pen Magnifier Loupe State
  const [chromaLoupe, setChromaLoupe] = useState<{
    clientX: number;
    clientY: number;
    canvasX: number;
    canvasY: number;
    color: ChromaTargetColor;
  } | null>(null);

  // Interactive Click-to-Place Shine Vector Points State
  const [internalShinePointStep, setInternalShinePointStep] = useState<'idle' | 'place-start' | 'place-end'>('idle');
  const shinePointStep = externalShinePointStep !== undefined ? externalShinePointStep : internalShinePointStep;
  const setShinePointStep = onShinePointStepChange || setInternalShinePointStep;
  const [tempShineStart, setTempShineStart] = useState<ShineVectorPoint | null>(null);
  const [hoverCanvasCoords, setHoverCanvasCoords] = useState<{ x: number; y: number } | null>(null);

  // Project Dimensions Controls State
  const [showDimensionsMenu, setShowDimensionsMenu] = useState<boolean>(false);
  const [customWidthInput, setCustomWidthInput] = useState<number>(project.width || 500);
  const [customHeightInput, setCustomHeightInput] = useState<number>(project.height || 500);
  const [lockRatio, setLockRatio] = useState<boolean>(false);
  const [scaleLayersWithResize, setScaleLayersWithResize] = useState<boolean>(false);

  useEffect(() => {
    setCustomWidthInput(project.width || 500);
    setCustomHeightInput(project.height || 500);
  }, [project.width, project.height]);

  // Effective multi-selection IDs
  const activeSelectedIds = useMemo(() => {
    if (selectedLayerIds && selectedLayerIds.length > 0) {
      return selectedLayerIds;
    }
    return selectedLayerId ? [selectedLayerId] : [];
  }, [selectedLayerIds, selectedLayerId]);

  // Active Drag / Interaction State
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState<EditableLayer['transform'] | null>(null);
  const [initialTransformsMap, setInitialTransformsMap] = useState<Record<string, EditableLayer['transform']>>({});
  const activeDragLayerIdRef = useRef<string | null>(null);
  const dragSessionRef = useRef<{
    handle: DragHandleType;
    layerId: string;
    startCanvas: Point;
    startClient: Point;
    startPan: Point;
    initialTransform: EditableLayer['transform'];
    initialBounds: { x: number; y: number; width: number; height: number };
    visualCenter: Point;
    visualW: number;
    visualH: number;
    uX: Point;
    uY: Point;
    vOffset: Point;
  } | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [cacheVersion, setCacheVersion] = useState<number>(0);

  // Real-time live shine preview time to animate and display shine color live on the layer
  const [liveShineTime, setLiveShineTime] = useState<number>(() => performance.now() / 1000);
  const shineAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const hasShine = layers.some(l => l.shineConfig?.enabled);
    if (!hasShine) {
      if (shineAnimRef.current) cancelAnimationFrame(shineAnimRef.current);
      return;
    }

    // Trigger instant render with updated color
    setLiveShineTime(performance.now() / 1000);

    let isSubscribed = true;
    let lastTime = performance.now();
    const tick = (now: number) => {
      if (!isSubscribed) return;
      if (now - lastTime >= 30) {
        lastTime = now;
        setLiveShineTime(now / 1000);
      }
      shineAnimRef.current = requestAnimationFrame(tick);
    };

    shineAnimRef.current = requestAnimationFrame(tick);
    return () => {
      isSubscribed = false;
      if (shineAnimRef.current) cancelAnimationFrame(shineAnimRef.current);
    };
  }, [layers]);

  const selectedLayer = useMemo(() => {
    return layers.find(l => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Preload and sync images into cache with debounced canvas redraw to prevent freeze/OOM on 200+ images
  useEffect(() => {
    let redrawTimer: any = null;
    const scheduleRedraw = () => {
      if (redrawTimer) return;
      redrawTimer = setTimeout(() => {
        redrawTimer = null;
        setCacheVersion(v => v + 1);
      }, 30);
    };

    // Clean up any stale keys from previous projects
    if (project.imagesMap) {
      for (const k in imagesCache.current) {
        if (!project.imagesMap[k]) {
          delete imagesCache.current[k];
        }
      }
    }

    let hasLoadedAny = false;
    for (const [key, dataUrl] of Object.entries(project.imagesMap || {})) {
      const existing = imagesCache.current[key];
      if (!existing || existing.src !== dataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          scheduleRedraw();
        };
        img.src = dataUrl;
        if (img.complete && img.naturalWidth > 0) {
          scheduleRedraw();
        }
        imagesCache.current[key] = img;
        hasLoadedAny = true;
      }
    }
    if (hasLoadedAny) {
      scheduleRedraw();
    }

    return () => {
      if (redrawTimer) clearTimeout(redrawTimer);
    };
  }, [project.fileName, project.imagesMap]);

  // Clean up image cache on unmount to release GPU and RAM memory
  useEffect(() => {
    return () => {
      for (const k in imagesCache.current) {
        const img = imagesCache.current[k];
        if (img) {
          img.onload = null;
          img.onerror = null;
          img.src = '';
        }
        delete imagesCache.current[k];
      }
    };
  }, []);

  // Preload and cache background image for preview
  useEffect(() => {
    if (!bgImageUrl) {
      bgImageRef.current = null;
      setCacheVersion(v => v + 1);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      setCacheVersion(v => v + 1);
    };
    img.onerror = () => {
      console.warn("Could not load background image for preview:", bgImageUrl);
    };
    img.src = bgImageUrl;
  }, [bgImageUrl]);

  // Helper to convert screen client coords to Canvas design coordinates (viewBox)
  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: (clientX - rect.left) * ((project.width || 500) / rect.width),
        y: (clientY - rect.top) * ((project.height || 500) / rect.height)
      };
    }
    const scale = Math.max(0.05, zoom / 100);
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }, [zoom, project.width, project.height]);

  // Compute Total Matrix for a Layer at current frame (incorporating keyframe animations)
  const computeLayerMatrix = useCallback((layer: EditableLayer, frame: any, effectiveFrameIdx?: number) => {
    const initialBounds = layer.initialBounds;
    const targetFrame = effectiveFrameIdx !== undefined ? effectiveFrameIdx : currentFrame;
    const animTransform = getLayerAnimatedTransform(layer, targetFrame);

    const deltaX = animTransform.x - initialBounds.x;
    const deltaY = animTransform.y - initialBounds.y;
    const scaleX = animTransform.scaleX;
    const scaleY = animTransform.scaleY;
    const rotation = animTransform.rotation;

    const pivotX = initialBounds.x + initialBounds.width / 2;
    const pivotY = initialBounds.y + initialBounds.height / 2;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // User affine matrix around pivot
    const uA = scaleX * cos;
    const uB = scaleX * sin;
    const uC = -scaleY * sin;
    const uD = scaleY * cos;
    const uTx = (pivotX + deltaX) - (uA * pivotX + uC * pivotY);
    const uTy = (pivotY + deltaY) - (uB * pivotX + uD * pivotY);

    const mUser: [number, number, number, number, number, number] = [uA, uB, uC, uD, uTx, uTy];

    // Frame native matrix
    const fA = frame?.transform?.a ?? 1;
    const fB = frame?.transform?.b ?? 0;
    const fC = frame?.transform?.c ?? 0;
    const fD = frame?.transform?.d ?? 1;
    const fTx = frame?.transform?.tx ?? 0;
    const fTy = frame?.transform?.ty ?? 0;
    const mFrame: [number, number, number, number, number, number] = [fA, fB, fC, fD, fTx, fTy];

    return multiplyMatrices(mUser, mFrame);
  }, [currentFrame]);

  // Helper to determine if a layer's frame is visible/active at given frameIndex
  const getLayerFrameState = useCallback((layer: EditableLayer, frameIdx: number, allowSelectedFallback: boolean = false) => {
    if (layer.isMerged || (layer.mergedLayers && layer.mergedLayers.length > 0)) {
      return { isActive: true, frame: { alpha: 1, transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } }, alpha: 1.0, effectiveFrameIdx: frameIdx };
    }

    const resolveFallbackState = () => {
      const frames = layer.spriteRef?.frames;
      if (frames && frames.length > 0) {
        const preferredIdx = layer.keyframeSummary?.activeFrames?.[0] ?? layer.inFrame ?? 0;
        const preferredFrame = frames[preferredIdx];
        if (preferredFrame && (typeof preferredFrame.alpha !== 'number' || preferredFrame.alpha > 0.005)) {
          return {
            isActive: true,
            frame: { ...preferredFrame, alpha: typeof preferredFrame.alpha === 'number' && preferredFrame.alpha > 0 ? preferredFrame.alpha : 1 },
            alpha: typeof preferredFrame.alpha === 'number' && preferredFrame.alpha > 0 ? preferredFrame.alpha : 1.0,
            effectiveFrameIdx: preferredIdx
          };
        }
        const firstActiveIdx = frames.findIndex((fr: any) => fr && (typeof fr.alpha !== 'number' || fr.alpha > 0.005));
        if (firstActiveIdx !== -1) {
          const fr = frames[firstActiveIdx];
          return {
            isActive: true,
            frame: { ...fr, alpha: typeof fr.alpha === 'number' && fr.alpha > 0 ? fr.alpha : 1 },
            alpha: typeof fr.alpha === 'number' && fr.alpha > 0 ? fr.alpha : 1.0,
            effectiveFrameIdx: firstActiveIdx
          };
        }
        const firstNonNullIdx = frames.findIndex((fr: any) => Boolean(fr));
        if (firstNonNullIdx !== -1) {
          const fr = frames[firstNonNullIdx];
          return {
            isActive: true,
            frame: { ...fr, alpha: 1 },
            alpha: 1.0,
            effectiveFrameIdx: firstNonNullIdx
          };
        }
      }
      return {
        isActive: true,
        frame: {
          alpha: 1,
          transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
          layout: {
            x: layer.initialBounds?.x || 0,
            y: layer.initialBounds?.y || 0,
            width: layer.initialBounds?.width || layer.transform?.width || 100,
            height: layer.initialBounds?.height || layer.transform?.height || 100
          }
        },
        alpha: 1.0,
        effectiveFrameIdx: layer.inFrame ?? 0
      };
    };

    // Guaranteed visibility and state for video sequence layers
    if (layer.isVideoSequence) {
      const startF = layer.inFrame !== undefined ? layer.inFrame : (layer.keyframeSummary?.startFrame ?? 0);
      const endF = layer.outFrame !== undefined ? layer.outFrame : (layer.keyframeSummary?.endFrame ?? (project.totalFrames - 1));
      if (frameIdx < startF || frameIdx > endF) {
        if (allowSelectedFallback) return resolveFallbackState();
        return { isActive: false, frame: null, alpha: 0, effectiveFrameIdx: frameIdx };
      }
      const frames = layer.spriteRef?.frames;
      const frame = (frames && frames[frameIdx]) || (frames && frames[0]) || {
        alpha: 1,
        transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
        layout: { x: 0, y: 0, width: layer.transform?.width || project.width, height: layer.transform?.height || project.height }
      };
      return {
        isActive: true,
        frame: {
          ...frame,
          alpha: 1,
          transform: frame.transform || { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
          layout: frame.layout || { x: 0, y: 0, width: layer.transform?.width || project.width, height: layer.transform?.height || project.height }
        },
        alpha: 1.0,
        effectiveFrameIdx: frameIdx
      };
    }

    const frames = layer.spriteRef?.frames;
    if (!frames || frames.length === 0) {
      if (allowSelectedFallback) return resolveFallbackState();
      return { isActive: false, frame: null, alpha: 0, effectiveFrameIdx: frameIdx };
    }

    const isSingleFrameStatic = frames.length === 1 || layer.framesCount === 1;

    // Check custom in/out duration span or keyframeSummary bounds
    const startF = layer.inFrame !== undefined ? layer.inFrame : (layer.keyframeSummary?.startFrame ?? 0);
    const endF = layer.outFrame !== undefined ? layer.outFrame : (layer.keyframeSummary?.endFrame ?? (project.totalFrames - 1));

    // For non-static layers, check if outside duration span
    if (!isSingleFrameStatic && (frameIdx < startF || frameIdx > endF)) {
      if (allowSelectedFallback) return resolveFallbackState();
      return { isActive: false, frame: null, alpha: 0, effectiveFrameIdx: frameIdx };
    }

    // Support single-frame static layers and repeated/looping sequence layers
    let frame = frames[frameIdx];
    if (!frame && isSingleFrameStatic) {
      frame = frames[0];
    } else if (!frame && frames.length > 0 && frames.length < project.totalFrames) {
      frame = frames[frameIdx % frames.length];
    }

    if (!frame) {
      if (allowSelectedFallback) return resolveFallbackState();
      return { isActive: false, frame: null, alpha: 0, effectiveFrameIdx: frameIdx };
    }

    let isActive = false;
    let frameAlpha = 0;

    // Check if layer has any explicit alpha > 0
    const hasAnyExplicitAlpha = Boolean(
      (layer.spriteRef as any)?._hasExplicitAlpha ||
      layer.keyframeSummary?.hasAnyExplicitAlpha ||
      frames.some((fr: any) => fr && typeof fr.alpha === 'number' && fr.alpha > 0.005)
    );

    if (hasAnyExplicitAlpha) {
      if (typeof frame.alpha === 'number') {
        frameAlpha = frame.alpha;
        isActive = frameAlpha > 0.005;
      } else {
        isActive = false;
        frameAlpha = 0;
      }
    } else if (typeof frame.alpha === 'number') {
      frameAlpha = frame.alpha;
      isActive = frameAlpha > 0.005;
    } else {
      // In rare SVGA files where alpha was never written, check if frame has content
      const hasImage = Boolean(layer.imageKey && (project.imagesMap[layer.imageKey] || layer.thumbnailUrl));
      const hasShapes = Boolean(frame.shapes && Array.isArray(frame.shapes) && frame.shapes.length > 0);
      const hasLayout = Boolean(frame.layout && (
        (frame.layout.width !== undefined && frame.layout.width > 0) || 
        (frame.layout.height !== undefined && frame.layout.height > 0)
      ));
      const hasTransform = Boolean(frame.transform);
      const hasClip = Boolean(frame.clipPath);

      if (hasImage || hasShapes || hasLayout || hasTransform || hasClip) {
        isActive = true;
        frameAlpha = 1.0;
      } else {
        isActive = false;
        frameAlpha = 0;
      }
    }

    if (!isActive && allowSelectedFallback) {
      return resolveFallbackState();
    }

    return { isActive, frame, alpha: frameAlpha, effectiveFrameIdx: frameIdx };
  }, [project.totalFrames, project.imagesMap]);

  // Compute visual bounding box & handles geometry for a layer in canvas coordinates
  const getLayerVisualGeometry = useCallback((layer: EditableLayer, frame: any, effectiveFrameIdx?: number) => {
    const totalMatrix = computeLayerMatrix(layer, frame, effectiveFrameIdx);
    const isMergedGroup = layer.isMerged || (layer.mergedLayers && layer.mergedLayers.length > 0);
    const cachedImg = imagesCache.current[layer.imageKey];

    let localX = 0;
    let localY = 0;
    let localW = cachedImg?.naturalWidth || layer.initialBounds.width || 100;
    let localH = cachedImg?.naturalHeight || layer.initialBounds.height || 100;

    if (isMergedGroup) {
      localX = layer.initialBounds.x;
      localY = layer.initialBounds.y;
      localW = layer.initialBounds.width;
      localH = layer.initialBounds.height;
    } else {
      localX = frame?.layout?.x ?? 0;
      localY = frame?.layout?.y ?? 0;
      if (frame?.layout && frame.layout.width > 0) {
        localW = frame.layout.width;
      }
      if (frame?.layout && frame.layout.height > 0) {
        localH = frame.layout.height;
      }
    }

    const p0 = transformPoint(totalMatrix, localX, localY); // top-left
    const p1 = transformPoint(totalMatrix, localX + localW, localY); // top-right
    const p2 = transformPoint(totalMatrix, localX + localW, localY + localH); // bottom-right
    const p3 = transformPoint(totalMatrix, localX, localY + localH); // bottom-left

    const midTop = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const midRight = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const midBottom = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const midLeft = { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 };
    const center = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };

    const topVectorX = p1.x - p0.x;
    const topVectorY = p1.y - p0.y;
    const topLen = Math.hypot(topVectorX, topVectorY) || 1;
    const leftVectorX = p3.x - p0.x;
    const leftVectorY = p3.y - p0.y;
    const leftLen = Math.hypot(leftVectorX, leftVectorY) || 1;

    // Outward normal pointing strictly OUTSIDE the top edge (away from leftVector = p3 - p0)
    let normalX = topVectorY / topLen;
    let normalY = -topVectorX / topLen;
    if (normalX * leftVectorX + normalY * leftVectorY > 0) {
      normalX = -normalX;
      normalY = -normalY;
    }

    const zoomScale = Math.max(0.25, zoom / 100);
    const rotOffset = Math.max(12, Math.min(34, 24 / zoomScale));
    const rotHandle = {
      x: midTop.x + normalX * rotOffset,
      y: midTop.y + normalY * rotOffset
    };

    return {
      totalMatrix,
      localX,
      localY,
      localW,
      localH,
      p0,
      p1,
      p2,
      p3,
      midTop,
      midRight,
      midBottom,
      midLeft,
      center,
      topVectorX,
      topVectorY,
      topLen,
      leftVectorX,
      leftVectorY,
      leftLen,
      rotHandle
    };
  }, [computeLayerMatrix, zoom]);

  // Zoom to Selected Element (Centers and focuses tightly on the selected element)
  const handleZoomToSelection = useCallback(() => {
    if (!selectedLayer || !containerRef.current) return;
    const { isActive, frame, effectiveFrameIdx } = getLayerFrameState(selectedLayer, currentFrame, true);
    if (!isActive || !frame) return;

    const geom = getLayerVisualGeometry(selectedLayer, frame, effectiveFrameIdx);
    const centerLayerX = geom.center.x;
    const centerLayerY = geom.center.y;
    const layerW = Math.max(20, geom.topLen);
    const layerH = Math.max(20, geom.leftLen);

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    // Target zoom so the item is clearly visible (taking up around 200px - 350px on screen)
    const targetZoom = Math.min(800, Math.max(150, Math.round(Math.min(cw / (layerW * 2.8), ch / (layerH * 2.8)) * 100)));
    
    // Canvas center
    const canvasCenterX = project.width / 2;
    const canvasCenterY = project.height / 2;
    const scale = targetZoom / 100;
    const panX = (canvasCenterX - centerLayerX) * scale;
    const panY = (canvasCenterY - centerLayerY) * scale;

    onZoomChange(targetZoom);
    onPanChange({ x: Math.round(panX), y: Math.round(panY) });
  }, [selectedLayer, currentFrame, getLayerFrameState, getLayerVisualGeometry, project, onZoomChange, onPanChange]);

  // Directional Micro-Nudge Function
  const handleMicroNudge = useCallback((dx: number, dy: number) => {
    if (!selectedLayer) return;
    const curX = selectedLayer.transform.x || 0;
    const curY = selectedLayer.transform.y || 0;
    onUpdateLayerTransform(selectedLayer.id, {
      x: Number((curX + dx).toFixed(2)),
      y: Number((curY + dy).toFixed(2))
    });
  }, [selectedLayer, onUpdateLayerTransform]);

  // Global Keyboard Arrow Listener for Pixel-Perfect Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedLayer) return;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }

      let step = 1;
      if (e.shiftKey) step = 10;
      else if (e.altKey || e.ctrlKey || e.metaKey) step = 0.1;

      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowUp') { dy = -step; }
      else if (e.key === 'ArrowDown') { dy = step; }
      else if (e.key === 'ArrowLeft') { dx = -step; }
      else if (e.key === 'ArrowRight') { dx = step; }
      else { return; }

      e.preventDefault();
      handleMicroNudge(dx, dy);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayer, handleMicroNudge]);

  // Render loop
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = project.width;
    const height = project.height;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Ensure maximum crispness and high-quality filtering for downscaled/resized layers
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background:
    // If a custom background image is uploaded, draw it firmly, uncropped, and fixed to fill the canvas
    if (bgImageRef.current && bgImageRef.current.complete && bgImageRef.current.naturalWidth > 0) {
      ctx.drawImage(bgImageRef.current, 0, 0, width, height);
    } else if (bgColor === 'transparent') {
      if (!patternCanvasRef.current) {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 32;
        pCanvas.height = 32;
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
          pCtx.fillStyle = '#0f172a';
          pCtx.fillRect(0, 0, 32, 32);
          pCtx.fillStyle = '#1e293b';
          pCtx.fillRect(0, 0, 16, 16);
          pCtx.fillRect(16, 16, 16, 16);
        }
        patternCanvasRef.current = pCanvas;
      }
      const pattern = ctx.createPattern(patternCanvasRef.current, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Pixel Grid if enabled
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Prepare Layer Buffer Canvas to isolate gift layers from background
    // (This guarantees that Edge Fade & Advanced Crop apply ONLY to the gift layers, leaving background pristine!)
    if (!layersCanvasRef.current) {
      layersCanvasRef.current = document.createElement('canvas');
    }
    const layersCanvas = layersCanvasRef.current;
    if (layersCanvas.width !== width || layersCanvas.height !== height) {
      layersCanvas.width = width;
      layersCanvas.height = height;
    }
    const layersCtx = layersCanvas.getContext('2d');
    if (!layersCtx) return;
    layersCtx.imageSmoothingEnabled = true;
    layersCtx.imageSmoothingQuality = 'high';
    layersCtx.clearRect(0, 0, width, height);

    // 3. Leaf sprite drawing helper
    const renderLeafSprite = (
      targetCtx: CanvasRenderingContext2D,
      layerItem: EditableLayer,
      totalMatrix: [number, number, number, number, number, number],
      alpha: number,
      isMask: boolean = false
    ) => {
      const isSelectedItem = !isMask && (layerItem.id === selectedLayerId || activeSelectedIds.includes(layerItem.id));
      const { isActive, frame, alpha: frameAlpha } = getLayerFrameState(layerItem, currentFrame, isSelectedItem);
      if (!isActive || !frame || frameAlpha <= 0.005) return;

      const fA = frame?.transform?.a ?? 1;
      const fB = frame?.transform?.b ?? 0;
      const fC = frame?.transform?.c ?? 0;
      const fD = frame?.transform?.d ?? 1;
      const fTx = frame?.transform?.tx ?? 0;
      const fTy = frame?.transform?.ty ?? 0;
      const mFrame: [number, number, number, number, number, number] = [fA, fB, fC, fD, fTx, fTy];

      const finalTotalMatrix = multiplyMatrices(totalMatrix, mFrame);

      targetCtx.save();
      targetCtx.globalAlpha = Math.max(0, Math.min(1, alpha * frameAlpha));

      // Support blendMode on frame or layer (only for regular sprites, not for masks)
      if (!isMask) {
        const rawBlend = frame.blendMode || layerItem.blendMode || layerItem.spriteRef?.blendMode;
        const bm = mapBlendMode(rawBlend);
        if (bm) {
          targetCtx.globalCompositeOperation = bm;
        }
      }

      targetCtx.transform(finalTotalMatrix[0], finalTotalMatrix[1], finalTotalMatrix[2], finalTotalMatrix[3], finalTotalMatrix[4], finalTotalMatrix[5]);

      // Apply ClipPath if existing
      if (frame.clipPath) {
        applySvgPathToContext(targetCtx, frame.clipPath);
      }

      // Render Shapes if existing
      if (frame.shapes && frame.shapes.length > 0) {
        renderSvgaShapes(targetCtx, frame.shapes);
      }

      // Draw Image (standard SVGA 2.0: drawn with exact layout offset without distortion)
      let activeImgKey = layerItem.imageKey;
      if (layerItem.isVideoSequence || layerItem.sequencePrefix) {
        const pfx = layerItem.sequencePrefix || 'frame_';
        const candidateKeys = [
          `${pfx}${currentFrame}.jpg`,
          `${pfx}${currentFrame}.png`,
          `${pfx}${currentFrame}.jpeg`,
          `${pfx}${currentFrame}.webp`,
          `${pfx}${currentFrame}`
        ];
        const matched = candidateKeys.find(k => (project.imagesMap && project.imagesMap[k]) || (imagesCache.current && imagesCache.current[k]));
        activeImgKey = matched || `${pfx}${currentFrame}.jpg`;
      }
      let cachedImg = imagesCache.current[activeImgKey];
      if (!cachedImg) {
        let src = project.imagesMap[activeImgKey] || (activeImgKey === layerItem.imageKey ? layerItem.thumbnailUrl : undefined);
        if (!src && project.imagesMap) {
          const rawK = activeImgKey;
          const cleanK = rawK.replace(/\.(png|jpe?g|webp|svg)$/i, '');
          src = project.imagesMap[cleanK] || 
                project.imagesMap[`${cleanK}.png`] || 
                project.imagesMap[`${cleanK}.jpg`] || 
                project.imagesMap[`${cleanK}.jpeg`] || 
                project.imagesMap[rawK.toLowerCase()] || 
                project.imagesMap[`img_${cleanK}`];
          if (!src) {
            const entry = Object.entries(project.imagesMap).find(([k]) => 
              k.toLowerCase() === rawK.toLowerCase() ||
              k.replace(/\.(png|jpe?g|webp|svg)$/i, '').toLowerCase() === cleanK.toLowerCase()
            );
            if (entry) src = entry[1];
          }
        }
        if (src) {
          const tempImg = new Image();
          tempImg.onload = () => {
            setCacheVersion(v => v + 1);
          };
          tempImg.src = src;
          imagesCache.current[activeImgKey] = tempImg;
          cachedImg = tempImg;
        }
      }

      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        let drawW = cachedImg.naturalWidth;
        let drawH = cachedImg.naturalHeight;
        
        if (frame.layout) {
          if (frame.layout.width && frame.layout.width > 0) {
            drawW = frame.layout.width;
          }
          if (frame.layout.height && frame.layout.height > 0) {
            drawH = frame.layout.height;
          }
        }
        
        targetCtx.drawImage(cachedImg, 0, 0, drawW, drawH);

        if (layerItem.shineConfig && layerItem.shineConfig.enabled) {
          renderLayerShine(
            targetCtx,
            drawW,
            drawH,
            currentFrame,
            project.totalFrames,
            layerItem.shineConfig,
            project.width,
            project.height,
            finalTotalMatrix,
            project.fps || 30,
            true,
            liveShineTime
          );
        }
      } else if (layerItem.shineConfig && layerItem.shineConfig.enabled) {
        const drawW = layerItem.transform.width || project.width;
        const drawH = layerItem.transform.height || project.height;
        renderLayerShine(
          targetCtx,
          drawW,
          drawH,
          currentFrame,
          project.totalFrames,
          layerItem.shineConfig,
          project.width,
          project.height,
          finalTotalMatrix,
          project.fps || 30,
          true,
          liveShineTime
        );
      }

      targetCtx.restore();
    };

    // Helper to find a mask layer by matteKey (searches current group/scope and top-level layers)
    const findMaskLayer = (matteKey: string, sourceLayer?: EditableLayer, scopeLayers?: EditableLayer[]): EditableLayer | undefined => {
      const target = String(matteKey).trim();
      const searchPool = scopeLayers && scopeLayers.length > 0 ? [...scopeLayers, ...layers] : layers;

      const exact = searchPool.find(m => {
        if (!m || m === sourceLayer) return false;
        if (m.imageKey === target || m.id === target || m.name === target) return true;
        if (m.spriteRef?.imageKey === target) return true;
        const rawIdx = String(m.originalIndex);
        if (rawIdx === target || `img_${rawIdx}` === target || `layer_${rawIdx}` === target) return true;
        if (m.imageKey && (m.imageKey.endsWith(`_${target}`) || target.endsWith(`_${m.imageKey}`))) return true;
        if (m.name && (m.name.endsWith(`_${target}`) || target.endsWith(`_${m.name}`))) return true;
        return false;
      });
      if (exact) return exact;

      if (sourceLayer && sourceLayer.groupId) {
        return searchPool.find(m => {
          if (!m || m === sourceLayer || m.groupId !== sourceLayer.groupId) return false;
          if (m.imageKey?.includes(target) || target.includes(m.imageKey || '')) return true;
          if (m.name?.includes(target) || target.includes(m.name || '')) return true;
          return false;
        });
      }
      return undefined;
    };

    // Recursive layer drawing function
    const renderLayerRecursive = (
      layerItem: EditableLayer,
      parentMatrix: [number, number, number, number, number, number] | null,
      parentAlpha: number,
      siblingLayers?: EditableLayer[]
    ) => {
      if (!layerItem.visible) return;

      const isSelectedItem = layerItem.id === selectedLayerId || activeSelectedIds.includes(layerItem.id);
      const { effectiveFrameIdx } = getLayerFrameState(layerItem, currentFrame, isSelectedItem);
      const animTransform = getLayerAnimatedTransform(layerItem, effectiveFrameIdx ?? currentFrame);
      const layerAlpha = Math.max(0, Math.min(1, (animTransform.opacity !== undefined ? animTransform.opacity : layerItem.transform.opacity) / 100));
      const currentAlpha = parentAlpha * layerAlpha;
      if (currentAlpha <= 0.001) return;

      // Calculate user transformation matrix for this layer relative to its initial bounds
      const initialBounds = layerItem.initialBounds || { x: 0, y: 0, width: 100, height: 100 };
      const deltaX = animTransform.x - initialBounds.x;
      const deltaY = animTransform.y - initialBounds.y;
      const scaleX = animTransform.scaleX;
      const scaleY = animTransform.scaleY;
      const rotation = animTransform.rotation;

      const pivotX = initialBounds.x + initialBounds.width / 2;
      const pivotY = initialBounds.y + initialBounds.height / 2;

      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const uA = scaleX * cos;
      const uB = scaleX * sin;
      const uC = -scaleY * sin;
      const uD = scaleY * cos;
      const uTx = (pivotX + deltaX) - (uA * pivotX + uC * pivotY);
      const uTy = (pivotY + deltaY) - (uB * pivotX + uD * pivotY);
      const mUser: [number, number, number, number, number, number] = [uA, uB, uC, uD, uTx, uTy];

      const currentTotalMatrix = parentMatrix ? multiplyMatrices(parentMatrix, mUser) : mUser;

      // If this layer has merged sublayers, recurse into sublayers!
      // Render sublayers in visual stacking order (bottom to top, so sublayers[0] is in front)
      if (layerItem.mergedLayers && layerItem.mergedLayers.length > 0) {
        const sublayersToRender = [...layerItem.mergedLayers].reverse();
        for (const sub of sublayersToRender) {
          if (isLayerMatteTemplate(sub)) continue;
          renderLayerRecursive(sub, currentTotalMatrix, currentAlpha, layerItem.mergedLayers);
        }
        return;
      }

      // Check if this layer has a matteKey mask
      if (layerItem.matteKey) {
        const maskLayer = findMaskLayer(layerItem.matteKey, layerItem, siblingLayers);
        if (maskLayer) {
          // If maskLayer is not active or transparent on this frame, the masked layer is 100% clipped
          const maskState = getLayerFrameState(maskLayer, currentFrame);
          if (!maskState.isActive || !maskState.frame || maskState.alpha <= 0.005) {
            return;
          }

          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
          }
          const offCanvas = offscreenCanvasRef.current;
          if (offCanvas.width !== width || offCanvas.height !== height) {
            offCanvas.width = width;
            offCanvas.height = height;
          }
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
            offCtx.clearRect(0, 0, width, height);

            // 1. Draw source layer (the effect / light streak / shine)
            renderLeafSprite(offCtx, layerItem, currentTotalMatrix, currentAlpha);

            // 2. Composite mask with destination-in
            offCtx.save();
            offCtx.globalCompositeOperation = 'destination-in';
            const maskAnim = getLayerAnimatedTransform(maskLayer, currentFrame);
            const maskAlpha = Math.max(0, Math.min(1, (maskAnim.opacity !== undefined ? maskAnim.opacity : maskLayer.transform.opacity) / 100));
            const maskBounds = maskLayer.initialBounds || { x: 0, y: 0, width: 100, height: 100 };
            const mDeltaX = maskAnim.x - maskBounds.x;
            const mDeltaY = maskAnim.y - maskBounds.y;
            const mPivotX = maskBounds.x + maskBounds.width / 2;
            const mPivotY = maskBounds.y + maskBounds.height / 2;
            const mRad = (maskAnim.rotation * Math.PI) / 180;
            const mCos = Math.cos(mRad);
            const mSin = Math.sin(mRad);
            const muA = maskAnim.scaleX * mCos;
            const muB = maskAnim.scaleX * mSin;
            const muC = -maskAnim.scaleY * mSin;
            const muD = maskAnim.scaleY * mCos;
            const muTx = (mPivotX + mDeltaX) - (muA * mPivotX + muC * mPivotY);
            const muTy = (mPivotY + mDeltaY) - (muB * mPivotX + muD * mPivotY);
            const mMaskUser: [number, number, number, number, number, number] = [muA, muB, muC, muD, muTx, muTy];
            const mMaskTotalMatrix = parentMatrix ? multiplyMatrices(parentMatrix, mMaskUser) : mMaskUser;
            renderLeafSprite(offCtx, maskLayer, mMaskTotalMatrix, maskAlpha, true /* isMask */);
            offCtx.restore();

            // 3. Draw masked result to layers canvas, respecting layer blend mode
            layersCtx.save();
            const rawBlend = layerItem.blendMode || layerItem.spriteRef?.blendMode;
            const bm = mapBlendMode(rawBlend);
            if (bm) {
              layersCtx.globalCompositeOperation = bm;
            }
            layersCtx.drawImage(offCanvas, 0, 0);
            layersCtx.restore();
            return;
          }
        }
      }

      // ⭐️ Alpha Matte Child Layers Rendering (دمج وقص القطع المدمجة داخل الطبقة الأم) ⭐️
      const childPieces = layers.filter(c => c.clipToLayerId === layerItem.id && c.visible);
      if (childPieces.length > 0) {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const tempCanvas = offscreenCanvasRef.current;
        if (tempCanvas.width !== width || tempCanvas.height !== height) {
          tempCanvas.width = width;
          tempCanvas.height = height;
        }
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'high';
          tempCtx.clearRect(0, 0, width, height);
          renderLeafSprite(tempCtx, layerItem, currentTotalMatrix, currentAlpha);

          for (const child of childPieces) {
            const childAnim = getLayerAnimatedTransform(child, currentFrame);
            const childAlpha = Math.max(0, Math.min(1, (childAnim.opacity !== undefined ? childAnim.opacity : child.transform.opacity) / 100));
            const childInitial = child.initialBounds || { x: 0, y: 0, width: 100, height: 100 };
            const cRad = (childAnim.rotation * Math.PI) / 180;
            const cCos = Math.cos(cRad);
            const cSin = Math.sin(cRad);
            const cPivotX = childInitial.x + childInitial.width / 2;
            const cPivotY = childInitial.y + childInitial.height / 2;
            const cA = childAnim.scaleX * cCos;
            const cB = childAnim.scaleX * cSin;
            const cC = -childAnim.scaleY * cSin;
            const cD = childAnim.scaleY * cCos;
            const cTx = (cPivotX + childAnim.x - childInitial.x) - (cA * cPivotX + cC * cPivotY);
            const cTy = (cPivotY + childAnim.y - childInitial.y) - (cB * cPivotX + cD * cPivotY);
            const mUserChild: [number, number, number, number, number, number] = [cA, cB, cC, cD, cTx, cTy];

            tempCtx.save();
            tempCtx.globalCompositeOperation = (child.blendMode as any) || 'source-atop';
            renderLeafSprite(tempCtx, child, mUserChild, childAlpha);
            tempCtx.restore();
          }

          layersCtx.drawImage(tempCanvas, 0, 0);
          return;
        }
      }

      // Standard leaf sprite drawing to layers canvas
      renderLeafSprite(layersCtx, layerItem, currentTotalMatrix, currentAlpha);
    };

    // Identify all layers serving as matte/mask templates
    const maskTemplateKeySet = new Set<string>();
    for (const l of layers) {
      if (l.matteKey) {
        maskTemplateKeySet.add(String(l.matteKey).trim());
      }
      if (l.spriteRef?.matteKey) {
        maskTemplateKeySet.add(String(l.spriteRef.matteKey).trim());
      }
    }

    const isLayerMatteTemplate = (layer: EditableLayer): boolean => {
      // If user selected this layer, always allow it to be rendered on canvas
      if (layer.id === selectedLayer?.id || selectedLayerIds.includes(layer.id)) return false;
      if (layer.isMatteMask) return true;
      const rawIdx = String(layer.originalIndex);
      if (
        maskTemplateKeySet.has(layer.id) || 
        maskTemplateKeySet.has(rawIdx) || 
        maskTemplateKeySet.has(`layer_${rawIdx}`) ||
        (layer.imageKey && maskTemplateKeySet.has(layer.imageKey)) ||
        (layer.name && maskTemplateKeySet.has(layer.name)) ||
        (layer.spriteRef?.imageKey && maskTemplateKeySet.has(layer.spriteRef.imageKey))
      ) {
        return true;
      }
      return false;
    };

    // Render all visible top-level layers in visual stacking order into layersCtx:
    // layers[last] (background) is drawn first -> layers[0] (foreground/top of stack) is drawn last (in front)!
    const layersToRender = [...layers].reverse();
    for (const layer of layersToRender) {
      // A matte mask template must NEVER be drawn as a standalone opaque layer on the canvas!
      if (isLayerMatteTemplate(layer)) {
        continue;
      }
      if (layer.clipToLayerId && layers.some(p => p.id === layer.clipToLayerId)) {
        continue;
      }
      renderLayerRecursive(layer, null, 1.0);
    }

    // 3.5 Apply Edge Fade & Advanced Edge Crop to the GIFT LAYERS ONLY on layersCtx!
    // (Notice: The uploaded background image on ctx is untouched, so it remains full, crisp, and fixed!)
    if (fadeConfig && cropConfig && cropFeather) {
      applyTransparencyEffects(layersCtx, width, height, fadeConfig, cropConfig, cropFeather, currentFrame, project.totalFrames || 30);
    }

    // 3.6 Draw the rendered & faded gift layers directly on top of the pristine background!
    ctx.drawImage(layersCanvas, 0, 0);

    // 3.7 Draw Pending & Live Freehand Pen Mask Cutout Overlay
    if (penStrokes && penStrokes.length > 0) {
      ctx.save();
      for (const stroke of penStrokes) {
        if (!stroke.points || stroke.points.length === 0) continue;
        ctx.save();
        const strokeColor = stroke.mode === 'erase' ? 'rgba(244, 63, 94, 0.5)' : 'rgba(16, 185, 129, 0.5)';
        const strokeBorder = stroke.mode === 'erase' ? '#f43f5e' : '#10b981';

        ctx.fillStyle = strokeColor;
        ctx.strokeStyle = strokeBorder;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.type === 'brush') {
          if (stroke.points.length === 1) {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
          }
        } else if (stroke.type === 'lasso') {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (stroke.type === 'rect' && stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];
          const rx = Math.min(p1.x, p2.x);
          const ry = Math.min(p1.y, p2.y);
          const rw = Math.abs(p2.x - p1.x);
          const rh = Math.abs(p2.y - p1.y);
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (stroke.type === 'circle' && stroke.points.length >= 2) {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    if (currentDrawingPoints && currentDrawingPoints.length > 0) {
      ctx.save();
      const activeMode = chromaMaskMode || 'erase';
      const strokeColor = activeMode === 'erase' ? 'rgba(244, 63, 94, 0.65)' : 'rgba(16, 185, 129, 0.65)';
      const strokeBorder = activeMode === 'erase' ? '#ffe4e6' : '#d1fae5';

      ctx.fillStyle = strokeColor;
      ctx.strokeStyle = strokeBorder;
      ctx.lineWidth = chromaBrushSize || 30;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tool = chromaPenTool || 'brush';
      if (tool === 'brush') {
        if (currentDrawingPoints.length === 1) {
          ctx.beginPath();
          ctx.arc(currentDrawingPoints[0].x, currentDrawingPoints[0].y, (chromaBrushSize || 30) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(currentDrawingPoints[0].x, currentDrawingPoints[0].y);
          for (let i = 1; i < currentDrawingPoints.length; i++) {
            ctx.lineTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y);
          }
          ctx.stroke();
        }
      } else if (tool === 'lasso') {
        ctx.beginPath();
        ctx.moveTo(currentDrawingPoints[0].x, currentDrawingPoints[0].y);
        for (let i = 1; i < currentDrawingPoints.length; i++) {
          ctx.lineTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (tool === 'rect' && currentDrawingPoints.length >= 2) {
        const p1 = currentDrawingPoints[0];
        const p2 = currentDrawingPoints[currentDrawingPoints.length - 1];
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.abs(p2.x - p1.x);
        const rh = Math.abs(p2.y - p1.y);
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (tool === 'circle' && currentDrawingPoints.length >= 2) {
        const p1 = currentDrawingPoints[0];
        const p2 = currentDrawingPoints[currentDrawingPoints.length - 1];
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Draw Active Smart Alignment Guides
    if (showGuides && activeGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      for (const guide of activeGuides) {
        ctx.beginPath();
        if (guide.type === 'vertical') {
          ctx.moveTo(guide.position, 0);
          ctx.lineTo(guide.position, height);
        } else {
          ctx.moveTo(0, guide.position);
          ctx.lineTo(width, guide.position);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Draw Selection Transform Box and Handles for Selected Layers
    const layersToHighlight = layers.filter(l => activeSelectedIds.includes(l.id) && l.visible && !l.locked);
    const zoomScale = Math.max(0.35, zoom / 100);

    for (const targetL of layersToHighlight) {
      const isPrimary = targetL.id === selectedLayerId;
      const { isActive, frame, effectiveFrameIdx } = getLayerFrameState(targetL, currentFrame, true);

      if (isActive && frame) {
        ctx.save();
        const geom = getLayerVisualGeometry(targetL, frame, effectiveFrameIdx);
        const { p0, p1, p2, p3, midTop, midRight, midBottom, midLeft, rotHandle } = geom;

        // Draw Bounding Polygon for layer
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();

        ctx.strokeStyle = isPrimary ? '#6366f1' : '#f59e0b'; // Indigo for primary, Amber for co-selected
        ctx.lineWidth = Math.max(1, (isPrimary ? 2 : 1.5) / Math.sqrt(zoomScale));
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.75, 1 / Math.sqrt(zoomScale));
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Render Transform Handles (for primary layer, or when only 1 is selected)
        if (isPrimary || activeSelectedIds.length === 1) {
          // Rotation stem (points strictly OUTSIDE above midTop)
          ctx.beginPath();
          ctx.moveTo(midTop.x, midTop.y);
          ctx.lineTo(rotHandle.x, rotHandle.y);
          ctx.strokeStyle = isPrimary ? '#6366f1' : '#f59e0b';
          ctx.lineWidth = Math.max(1, 1.5 / Math.sqrt(zoomScale));
          ctx.stroke();

          // Rotation Handle circle
          const rotRadius = Math.max(3.2, Math.min(6.5, 5.5 / Math.sqrt(zoomScale)));
          ctx.beginPath();
          ctx.arc(rotHandle.x, rotHandle.y, rotRadius, 0, Math.PI * 2);
          ctx.fillStyle = isPrimary ? '#a855f7' : '#f59e0b'; // Purple or Amber rotation knob
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, 1.5 / Math.sqrt(zoomScale));
          ctx.stroke();

          // Always draw all 8 resize handles (4 corners + 4 midpoints) so stretching is always available
          const handlesToDraw = [p0, midTop, p1, midRight, p2, midBottom, p3, midLeft];
          const handleRadius = Math.max(2.8, Math.min(6, 5 / Math.sqrt(zoomScale)));

          handlesToDraw.forEach((h, idx) => {
            const isCorner = idx % 2 === 0;
            ctx.beginPath();
            ctx.arc(h.x, h.y, isCorner ? handleRadius : handleRadius * 0.88, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = isPrimary ? '#6366f1' : '#f59e0b';
            ctx.lineWidth = Math.max(1, 1.8 / Math.sqrt(zoomScale));
            ctx.stroke();
          });
        }

        ctx.restore();
      }
    }
  }, [project, layers, selectedLayer, activeSelectedIds, selectedLayerId, currentFrame, zoom, bgColor, showGrid, showGuides, activeGuides, getLayerVisualGeometry, getLayerFrameState, cacheVersion, fadeConfig, cropConfig, cropFeather, liveShineTime]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Helper to check if a canvas point (cx, cy) is inside a layer's transformed bounding box
  const isPointInsideLayerBox = useCallback((layer: EditableLayer, frame: any, cx: number, cy: number, margin: number = 6, effectiveFrameIdx?: number): boolean => {
    const geom = getLayerVisualGeometry(layer, frame, effectiveFrameIdx);
    const [a, b, c, d, tx, ty] = geom.totalMatrix;
    const det = a * d - b * c;
    if (Math.abs(det) < 0.00001) return false;

    const invA = d / det;
    const invB = -b / det;
    const invC = -c / det;
    const invD = a / det;
    const invTx = (c * ty - d * tx) / det;
    const invTy = (b * tx - a * ty) / det;

    const localPointX = invA * cx + invC * cy + invTx;
    const localPointY = invB * cx + invD * cy + invTy;

    return (
      localPointX >= geom.localX - margin &&
      localPointX <= geom.localX + geom.localW + margin &&
      localPointY >= geom.localY - margin &&
      localPointY <= geom.localY + geom.localH + margin
    );
  }, [getLayerVisualGeometry]);

  // Hit test to find layer under cursor (search foreground to background: layers[0] to layers[last])
  // Locked layers are completely skipped so they cannot be clicked/selected on canvas
  const hitTestLayer = useCallback((cx: number, cy: number): string | null => {
    const candidates: Array<{ id: string; area: number; index: number }> = [];
    const zoomScale = Math.max(0.25, zoom / 100);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer.visible || layer.locked || layer.isMatteMask) continue;

      const isCurrSelected = layer.id === selectedLayerId || activeSelectedIds.includes(layer.id);
      const { isActive, frame, effectiveFrameIdx } = getLayerFrameState(layer, currentFrame, isCurrSelected);
      if (!isActive || !frame) continue;

      const geom = getLayerVisualGeometry(layer, frame, effectiveFrameIdx);
      const hitMargin = Math.max(4, Math.min(14, 8 / zoomScale));

      if (isPointInsideLayerBox(layer, frame, cx, cy, hitMargin, effectiveFrameIdx)) {
        // CRITICAL FIX: Compute actual visual area on canvas (topLen * leftLen), NOT raw unscaled naturalWidth * naturalHeight!
        const visualArea = Math.max(1, geom.topLen * geom.leftLen);
        candidates.push({ id: layer.id, area: visualArea, index: i });
      }
    }

    if (candidates.length === 0) return null;

    // Prioritize currently selected layer if it's directly under the cursor and isn't a full-canvas background covering a smaller icon
    candidates.sort((a, b) => {
      const canvasArea = (project.width || 500) * (project.height || 500);
      const aIsFull = a.area >= canvasArea * 0.7;
      const bIsFull = b.area >= canvasArea * 0.7;
      if (aIsFull !== bIsFull) {
        return aIsFull ? 1 : -1;
      }

      if (selectedLayer) {
        if (a.id === selectedLayer.id) return -1;
        if (b.id === selectedLayer.id) return 1;
      }

      // If one candidate is significantly smaller on canvas, prioritize the smaller element
      const areaRatio = a.area / Math.max(1, b.area);
      if (areaRatio > 2.0) return 1;
      if (areaRatio < 0.5) return -1;

      // Otherwise top-most in z-stack (smaller index in layers array) wins
      return a.index - b.index;
    });

    return candidates[0].id;
  }, [layers, currentFrame, zoom, selectedLayerId, activeSelectedIds, getLayerFrameState, getLayerVisualGeometry, isPointInsideLayerBox, selectedLayer, project.width, project.height]);

  // Determine handle under mouse for selected layer (all 8 resize handles + rotation handle + interior move)
  const getHandleUnderMouse = useCallback((cx: number, cy: number): DragHandleType | null => {
    if (!selectedLayer || selectedLayer.locked || !selectedLayer.visible) return null;
    const { isActive, frame, effectiveFrameIdx } = getLayerFrameState(selectedLayer, currentFrame, true);
    if (!isActive || !frame) return null;

    const geom = getLayerVisualGeometry(selectedLayer, frame, effectiveFrameIdx);
    const { p0, p1, p2, p3, midTop, midRight, midBottom, midLeft, rotHandle } = geom;
    const zoomScale = Math.max(0.25, zoom / 100);

    // 0. Shine vector path handles check (if shine enabled on selected layer)
    if (selectedLayer.shineConfig?.enabled && selectedLayer.shineConfig.editPathOnCanvas !== false) {
      const sPt = selectedLayer.shineConfig.startPoint || {
        x: Math.round(selectedLayer.transform.x + selectedLayer.transform.width / 2),
        y: Math.max(0, Math.round(selectedLayer.transform.y - 30))
      };
      const ePt = selectedLayer.shineConfig.endPoint || {
        x: Math.round(selectedLayer.transform.x + selectedLayer.transform.width / 2),
        y: Math.round(selectedLayer.transform.y + selectedLayer.transform.height + 30)
      };
      const mPt = { x: (sPt.x + ePt.x) / 2, y: (sPt.y + ePt.y) / 2 };

      const shineHitDist = Math.max(10, 22 / zoomScale);
      if (Math.hypot(cx - sPt.x, cy - sPt.y) <= shineHitDist) return 'shine-start';
      if (Math.hypot(cx - ePt.x, cy - ePt.y) <= shineHitDist) return 'shine-end';
      if (Math.hypot(cx - mPt.x, cy - mPt.y) <= shineHitDist) return 'shine-mid';
    }

    // 1. Check rotation handle + all 8 resize handles (4 corners + 4 midpoints) and pick the closest within hit radius
    const hitRadius = Math.max(6, Math.min(20, 14 / zoomScale));
    const handleCandidates: Array<{ type: DragHandleType; pt: Point; bonus: number }> = [
      { type: 'rot', pt: rotHandle, bonus: 1.5 },
      { type: 'nw', pt: p0, bonus: 1.0 },
      { type: 'ne', pt: p1, bonus: 1.0 },
      { type: 'se', pt: p2, bonus: 1.0 },
      { type: 'sw', pt: p3, bonus: 1.0 },
      { type: 'n', pt: midTop, bonus: 0 },
      { type: 'e', pt: midRight, bonus: 0 },
      { type: 's', pt: midBottom, bonus: 0 },
      { type: 'w', pt: midLeft, bonus: 0 },
    ];

    let bestHandle: DragHandleType | null = null;
    let bestScore = Infinity;

    for (const h of handleCandidates) {
      const d = Math.hypot(cx - h.pt.x, cy - h.pt.y);
      if (d <= hitRadius) {
        const score = d - h.bonus;
        if (score < bestScore) {
          bestScore = score;
          bestHandle = h.type;
        }
      }
    }

    if (bestHandle) {
      return bestHandle;
    }

    // 2. If cursor is inside the selectedLayer's bounding box, return 'move' directly so dragging the selected layer NEVER loses selection!
    if (isPointInsideLayerBox(selectedLayer, frame, cx, cy, Math.max(3, 6 / zoomScale), effectiveFrameIdx)) {
      return 'move';
    }

    return null;
  }, [selectedLayer, currentFrame, zoom, getLayerFrameState, getLayerVisualGeometry, isPointInsideLayerBox]);

  // Global Window MouseUp Listener for Freehand Pen Drawing
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawingPenRef.current) {
        isDrawingPenRef.current = false;
        setIsDrawingPen(false);
        const points = currentDrawingPointsRef.current;
        if (points && points.length > 0) {
          const stroke: PenMaskStroke = {
            type: chromaPenTool || 'brush',
            points: [...points],
            brushSize: chromaBrushSize || 30,
            mode: chromaMaskMode || 'erase',
            feather: chromaPenFeather || 8,
            opacity: chromaPenOpacity || 100
          };
          onAddPenStroke?.(stroke);
        }
        currentDrawingPointsRef.current = [];
        setCurrentDrawingPoints([]);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [chromaPenTool, chromaBrushSize, chromaMaskMode, chromaPenFeather, chromaPenOpacity, onAddPenStroke]);

  // Dynamic Hover Cursor
  const [canvasCursor, setCanvasCursor] = useState<string>('default');

  // Helper to initialize a synchronous drag session for a target layer
  const startLayerDragSession = useCallback((
    handle: DragHandleType,
    targetLayer: EditableLayer,
    startCanvas: Point,
    clientX: number,
    clientY: number
  ) => {
    onPausePlayback?.();
    const { frame, effectiveFrameIdx } = getLayerFrameState(targetLayer, currentFrame, true);
    const geom = getLayerVisualGeometry(targetLayer, frame, effectiveFrameIdx);
    const animTransform = getLayerAnimatedTransform(targetLayer, effectiveFrameIdx ?? currentFrame);

    const visualW = Math.max(2, geom.topLen);
    const visualH = Math.max(2, geom.leftLen);
    const uX = { x: geom.topVectorX / visualW, y: geom.topVectorY / visualW };
    const uY = { x: geom.leftVectorX / visualH, y: geom.leftVectorY / visualH };

    const initBounds = targetLayer.initialBounds || { x: 0, y: 0, width: 100, height: 100 };
    const pivotWorld0 = {
      x: animTransform.x + initBounds.width / 2,
      y: animTransform.y + initBounds.height / 2
    };
    const vOffset = {
      x: geom.center.x - pivotWorld0.x,
      y: geom.center.y - pivotWorld0.y
    };

    const snapTransform: EditableLayer['transform'] = {
      ...targetLayer.transform,
      x: animTransform.x,
      y: animTransform.y,
      scaleX: animTransform.scaleX,
      scaleY: animTransform.scaleY,
      rotation: animTransform.rotation
    };

    activeDragLayerIdRef.current = targetLayer.id;
    dragSessionRef.current = {
      handle,
      layerId: targetLayer.id,
      startCanvas,
      startClient: { x: clientX, y: clientY },
      startPan: { ...panOffset },
      initialTransform: snapTransform,
      initialBounds: { ...initBounds },
      visualCenter: geom.center,
      visualW,
      visualH,
      uX,
      uY,
      vOffset
    };

    setIsInteracting(true);
    setDragHandle(handle);
    setDragStart(startCanvas);
    setInitialTransform(snapTransform);
    setInitialTransformsMap({ [targetLayer.id]: snapTransform });
  }, [onPausePlayback, getLayerFrameState, currentFrame, getLayerVisualGeometry, panOffset]);

  // Core Drag Move Logic (callable from both React onMouseMove and Window mousemove)
  const processActiveDragMove = useCallback((clientX: number, clientY: number, shiftKey: boolean, altKey: boolean) => {
    const session = dragSessionRef.current;
    if (!session) return;

    if (session.handle === 'pan') {
      const dx = clientX - session.startClient.x;
      const dy = clientY - session.startClient.y;
      onPanChange({ x: session.startPan.x + dx, y: session.startPan.y + dy });
      return;
    }

    const coords = clientToCanvasCoords(clientX, clientY);
    const targetDragLayer = layers.find(l => l.id === session.layerId) || selectedLayer;
    if (!targetDragLayer) return;

    if (session.handle === 'shine-start' && targetDragLayer.shineConfig && onUpdateShineConfig) {
      const ePt = targetDragLayer.shineConfig.endPoint || {
        x: Math.round(targetDragLayer.transform.x + targetDragLayer.transform.width / 2),
        y: Math.round(targetDragLayer.transform.y + targetDragLayer.transform.height + 30)
      };
      const newStart = { x: Math.round(coords.x), y: Math.round(coords.y) };
      const angle = Math.round((Math.atan2(ePt.y - newStart.y, ePt.x - newStart.x) * 180) / Math.PI);
      onUpdateShineConfig(targetDragLayer.id, { startPoint: newStart, angleDeg: (angle + 360) % 360 });
      return;
    }

    if (session.handle === 'shine-end' && targetDragLayer.shineConfig && onUpdateShineConfig) {
      const sPt = targetDragLayer.shineConfig.startPoint || {
        x: Math.round(targetDragLayer.transform.x + targetDragLayer.transform.width / 2),
        y: Math.max(0, Math.round(targetDragLayer.transform.y - 30))
      };
      const newEnd = { x: Math.round(coords.x), y: Math.round(coords.y) };
      const angle = Math.round((Math.atan2(newEnd.y - sPt.y, newEnd.x - sPt.x) * 180) / Math.PI);
      onUpdateShineConfig(targetDragLayer.id, { endPoint: newEnd, angleDeg: (angle + 360) % 360 });
      return;
    }

    if (session.handle === 'shine-mid' && targetDragLayer.shineConfig && onUpdateShineConfig) {
      const deltaX = coords.x - session.startCanvas.x;
      const deltaY = coords.y - session.startCanvas.y;
      const sPt = targetDragLayer.shineConfig.startPoint || {
        x: Math.round(targetDragLayer.transform.x + targetDragLayer.transform.width / 2),
        y: Math.max(0, Math.round(targetDragLayer.transform.y - 30))
      };
      const ePt = targetDragLayer.shineConfig.endPoint || {
        x: Math.round(targetDragLayer.transform.x + targetDragLayer.transform.width / 2),
        y: Math.round(targetDragLayer.transform.y + targetDragLayer.transform.height + 30)
      };
      onUpdateShineConfig(targetDragLayer.id, {
        startPoint: { x: Math.round(sPt.x + deltaX), y: Math.round(sPt.y + deltaY) },
        endPoint: { x: Math.round(ePt.x + deltaX), y: Math.round(ePt.y + deltaY) }
      });
      session.startCanvas = coords;
      return;
    }

    const { initialTransform: initTrans, initialBounds: initBounds, visualCenter, visualW, visualH, uX, uY, vOffset } = session;
    const deltaX = coords.x - session.startCanvas.x;
    const deltaY = coords.y - session.startCanvas.y;

    if (session.handle === 'move') {
      let newX = Math.round((initTrans.x + deltaX) * 10) / 10;
      let newY = Math.round((initTrans.y + deltaY) * 10) / 10;

      // Smart Snapping to Canvas Center using actual visual center
      const guides: GuideLine[] = [];
      const curVisualCenterX = visualCenter.x + deltaX;
      const curVisualCenterY = visualCenter.y + deltaY;
      const snapThreshold = 5;

      if (Math.abs(curVisualCenterX - project.width / 2) <= snapThreshold) {
        const snapCorrectionX = project.width / 2 - curVisualCenterX;
        newX = Math.round((newX + snapCorrectionX) * 10) / 10;
        guides.push({ type: 'vertical', position: project.width / 2 });
      }
      if (Math.abs(curVisualCenterY - project.height / 2) <= snapThreshold) {
        const snapCorrectionY = project.height / 2 - curVisualCenterY;
        newY = Math.round((newY + snapCorrectionY) * 10) / 10;
        guides.push({ type: 'horizontal', position: project.height / 2 });
      }

      setActiveGuides(guides);
      onUpdateLayerTransform(targetDragLayer.id, { x: newX, y: newY });
    } else if (session.handle === 'rot') {
      // Rotate around the actual visual center on canvas
      const angleRad = Math.atan2(coords.y - visualCenter.y, coords.x - visualCenter.x);
      let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90;
      if (angleDeg > 180) angleDeg -= 360;
      if (angleDeg < -180) angleDeg += 360;

      if (shiftKey) {
        angleDeg = Math.round(angleDeg / 45) * 45;
      }

      const deltaRad = ((angleDeg - initTrans.rotation) * Math.PI) / 180;
      const rotVOffX = vOffset.x * Math.cos(deltaRad) - vOffset.y * Math.sin(deltaRad);
      const rotVOffY = vOffset.x * Math.sin(deltaRad) + vOffset.y * Math.cos(deltaRad);
      const newX = Math.round((initTrans.x + (vOffset.x - rotVOffX)) * 10) / 10;
      const newY = Math.round((initTrans.y + (vOffset.y - rotVOffY)) * 10) / 10;

      onUpdateLayerTransform(targetDragLayer.id, {
        rotation: angleDeg,
        x: newX,
        y: newY
      });
    } else if (['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].includes(session.handle)) {
      // Project mouse delta onto the layer's visual axes (uX, uY)
      const dX = deltaX * uX.x + deltaY * uX.y;
      const dY = deltaX * uY.x + deltaY * uY.y;

      const h = session.handle;
      const isCorner = ['nw', 'ne', 'se', 'sw'].includes(h);

      let newVisualW = visualW;
      let newVisualH = visualH;

      if (h.includes('e')) {
        newVisualW = Math.max(4, visualW + (altKey ? dX * 2 : dX));
      } else if (h.includes('w')) {
        newVisualW = Math.max(4, visualW - (altKey ? dX * 2 : dX));
      }

      if (h.includes('s')) {
        newVisualH = Math.max(4, visualH + (altKey ? dY * 2 : dY));
      } else if (h.includes('n')) {
        newVisualH = Math.max(4, visualH - (altKey ? dY * 2 : dY));
      }

      let ratioX = newVisualW / visualW;
      let ratioY = newVisualH / visualH;

      if (isCorner && (targetDragLayer.aspectRatioLocked || shiftKey)) {
        // Support both shrinking (ratio < 1) and growing (ratio > 1) smoothly
        const dominantRatio = Math.abs(dX / visualW) >= Math.abs(dY / visualH) ? ratioX : ratioY;
        const clampedRatio = Math.max(0.03, dominantRatio);
        ratioX = clampedRatio;
        ratioY = clampedRatio;
        newVisualW = visualW * ratioX;
        newVisualH = visualH * ratioY;
      }

      // Compute center shift along uX and uY so the opposite edge/corner stays anchored
      let shiftAlongX = 0;
      let shiftAlongY = 0;
      if (!altKey) {
        if (h.includes('e')) shiftAlongX = (newVisualW - visualW) / 2;
        else if (h.includes('w')) shiftAlongX = -(newVisualW - visualW) / 2;

        if (h.includes('s')) shiftAlongY = (newVisualH - visualH) / 2;
        else if (h.includes('n')) shiftAlongY = -(newVisualH - visualH) / 2;
      }

      // Compensate for any offset between visualCenter and pivotWorld0 so the layer never jumps
      const vOffX = vOffset.x * uX.x + vOffset.y * uX.y;
      const vOffY = vOffset.x * uY.x + vOffset.y * uY.y;

      const totalShiftAlongX = shiftAlongX - vOffX * (ratioX - 1);
      const totalShiftAlongY = shiftAlongY - vOffY * (ratioY - 1);

      const worldShiftX = totalShiftAlongX * uX.x + totalShiftAlongY * uY.x;
      const worldShiftY = totalShiftAlongX * uX.y + totalShiftAlongY * uY.y;

      const newX = Math.round((initTrans.x + worldShiftX) * 10) / 10;
      const newY = Math.round((initTrans.y + worldShiftY) * 10) / 10;

      const signX = initTrans.scaleX < 0 ? -1 : 1;
      const signY = initTrans.scaleY < 0 ? -1 : 1;
      const baseScaleX = Math.max(0.01, Math.abs(initTrans.scaleX || 1));
      const baseScaleY = Math.max(0.01, Math.abs(initTrans.scaleY || 1));

      const newScaleX = signX * Math.max(0.02, Math.min(25, baseScaleX * ratioX));
      const newScaleY = signY * Math.max(0.02, Math.min(25, baseScaleY * ratioY));

      const baseW = Math.max(4, initBounds.width || initTrans.width || visualW);
      const baseH = Math.max(4, initBounds.height || initTrans.height || visualH);

      onUpdateLayerTransform(targetDragLayer.id, {
        x: newX,
        y: newY,
        scaleX: parseFloat(newScaleX.toFixed(4)),
        scaleY: parseFloat(newScaleY.toFixed(4)),
        width: Math.max(1, Math.round(baseW * Math.abs(newScaleX))),
        height: Math.max(1, Math.round(baseH * Math.abs(newScaleY)))
      });
    }
  }, [clientToCanvasCoords, layers, selectedLayer, onPanChange, onUpdateShineConfig, onUpdateLayerTransform, project.width, project.height]);

  // Mouse Up Handler
  const handleMouseUp = useCallback(() => {
    const session = dragSessionRef.current;
    if ((session && session.handle !== 'pan') || (isInteracting && dragHandle && dragHandle !== 'pan')) {
      onDragEnd?.();
    }
    dragSessionRef.current = null;
    activeDragLayerIdRef.current = null;
    setIsInteracting(false);
    setDragHandle(null);
    setInitialTransform(null);
    setActiveGuides([]);
  }, [isInteracting, dragHandle, onDragEnd]);

  // Attach global window mousemove & mouseup listeners while dragging so moving over pills or outside viewport never drops the drag
  useEffect(() => {
    if (!isInteracting) return;

    const onWindowMouseMove = (ev: MouseEvent) => {
      processActiveDragMove(ev.clientX, ev.clientY, ev.shiftKey, ev.altKey);
    };
    const onWindowMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isInteracting, processActiveDragMove, handleMouseUp]);

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'chroma-pen' || isChromaPenActive) {
      if (chromaSubMode === 'picker') {
        if (canvasRef.current && onChromaPickColor) {
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = project.width / rect.width;
          const scaleY = project.height / rect.height;
          const cx = Math.round((e.clientX - rect.left) * scaleX);
          const cy = Math.round((e.clientY - rect.top) * scaleY);
          if (cx >= 0 && cx < project.width && cy >= 0 && cy < project.height) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const p = ctx.getImageData(cx, cy, 1, 1).data;
              const color: ChromaTargetColor = {
                r: p[0],
                g: p[1],
                b: p[2],
                hex: rgbToHex(p[0], p[1], p[2])
              };
              onChromaPickColor(color);
            }
          }
        }
        return;
      }

      // Freehand Pen Mask Cutout Drawing
      if (e.button === 0) {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        setIsDrawingPen(true);
        isDrawingPenRef.current = true;
        currentDrawingPointsRef.current = [coords];
        setCurrentDrawingPoints([coords]);
        return;
      }
    }

    if (e.button === 1 || activeTool === 'hand') {
      dragSessionRef.current = {
        handle: 'pan',
        layerId: '',
        startCanvas: { x: 0, y: 0 },
        startClient: { x: e.clientX, y: e.clientY },
        startPan: { ...panOffset },
        initialTransform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100 },
        initialBounds: { x: 0, y: 0, width: 100, height: 100 },
        visualCenter: { x: 0, y: 0 },
        visualW: 100,
        visualH: 100,
        uX: { x: 1, y: 0 },
        uY: { x: 0, y: 1 },
        vOffset: { x: 0, y: 0 }
      };
      setIsInteracting(true);
      setDragHandle('pan');
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    const coords = clientToCanvasCoords(e.clientX, e.clientY);

    // Interactive Step-by-Step Shine Point Placement (Start -> End)
    if (shinePointStep === 'place-start' && selectedLayer?.shineConfig && onUpdateShineConfig) {
      setTempShineStart(coords);
      setShinePointStep('place-end');
      return;
    }
    if (shinePointStep === 'place-end' && selectedLayer?.shineConfig && onUpdateShineConfig && tempShineStart) {
      const angle = Math.round((Math.atan2(coords.y - tempShineStart.y, coords.x - tempShineStart.x) * 180) / Math.PI);
      onUpdateShineConfig(selectedLayer.id, {
        startPoint: tempShineStart,
        endPoint: coords,
        angleDeg: (angle + 360) % 360
      });
      setShinePointStep('idle');
      setTempShineStart(null);
      return;
    }

    const isModifierKey = e.ctrlKey || e.metaKey || e.shiftKey;
    const handle = getHandleUnderMouse(coords.x, coords.y);

    if (handle && selectedLayer) {
      startLayerDragSession(handle, selectedLayer, coords, e.clientX, e.clientY);
    } else {
      const clickedId = hitTestLayer(coords.x, coords.y);
      if (clickedId) {
        onSelectLayer(clickedId, false);

        const targetLayer = layers.find(l => l.id === clickedId);
        if (targetLayer) {
          startLayerDragSession('move', targetLayer, coords, e.clientX, e.clientY);
        }
      } else {
        activeDragLayerIdRef.current = null;
        dragSessionRef.current = null;
        if (!isModifierKey) {
          onSelectLayer(null, false);
        }
      }
    }
  };

  // Mouse Move Event Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingPenRef.current) {
      const coords = clientToCanvasCoords(e.clientX, e.clientY);
      const prev = currentDrawingPointsRef.current;
      if (prev.length === 0) {
        currentDrawingPointsRef.current = [coords];
        setCurrentDrawingPoints([coords]);
      } else {
        const last = prev[prev.length - 1];
        if (Math.hypot(coords.x - last.x, coords.y - last.y) >= 2) {
          const updated = [...prev, coords];
          currentDrawingPointsRef.current = updated;
          setCurrentDrawingPoints(updated);
        }
      }
      return;
    }

    if (!isInteracting && !dragSessionRef.current) {
      if (activeTool === 'chroma-pen') {
        setCanvasCursor('crosshair');
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = project.width / rect.width;
          const scaleY = project.height / rect.height;
          const cx = Math.round((e.clientX - rect.left) * scaleX);
          const cy = Math.round((e.clientY - rect.top) * scaleY);
          if (cx >= 0 && cx < project.width && cy >= 0 && cy < project.height) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const p = ctx.getImageData(cx, cy, 1, 1).data;
              const color: ChromaTargetColor = {
                r: p[0],
                g: p[1],
                b: p[2],
                hex: rgbToHex(p[0], p[1], p[2])
              };
              setChromaLoupe({
                clientX: e.clientX,
                clientY: e.clientY,
                canvasX: cx,
                canvasY: cy,
                color
              });
              onChromaHoverColor?.(color);
            }
          } else {
            setChromaLoupe(null);
            onChromaHoverColor?.(null);
          }
        }
        return;
      }

      if (activeTool === 'hand') {
        setCanvasCursor('grab');
        return;
      }
      const coords = clientToCanvasCoords(e.clientX, e.clientY);
      setHoverCanvasCoords(coords);

      if (shinePointStep !== 'idle') {
        setCanvasCursor('crosshair');
        return;
      }

      const handle = getHandleUnderMouse(coords.x, coords.y);

      if (handle) {
        if (handle === 'rot') setCanvasCursor('crosshair');
        else if (handle === 'shine-start' || handle === 'shine-end') setCanvasCursor('pointer');
        else if (handle === 'shine-mid') setCanvasCursor('grab');
        else if (handle === 'nw' || handle === 'se') setCanvasCursor('nwse-resize');
        else if (handle === 'ne' || handle === 'sw') setCanvasCursor('nesw-resize');
        else if (handle === 'n' || handle === 's') setCanvasCursor('ns-resize');
        else if (handle === 'e' || handle === 'w') setCanvasCursor('ew-resize');
        else if (handle === 'move') setCanvasCursor('move');
        else setCanvasCursor('default');
      } else {
        const hoverId = hitTestLayer(coords.x, coords.y);
        if (hoverId) {
          setCanvasCursor('move');
        } else {
          setCanvasCursor('default');
        }
      }
      return;
    }

    processActiveDragMove(e.clientX, e.clientY, e.shiftKey, e.altKey);
  };

  // Wheel Zoom / Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(15, Math.min(500, Math.round(zoom * zoomFactor)));
      onZoomChange(newZoom);
    } else {
      onPanChange({
        x: panOffset.x - e.deltaX * 0.8,
        y: panOffset.y - e.deltaY * 0.8
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050811] overflow-hidden flex items-center justify-center select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setChromaLoupe(null);
        onChromaHoverColor?.(null);
      }}
      onWheel={handleWheel}
      style={{ cursor: activeTool === 'hand' || dragHandle === 'pan' ? 'grab' : canvasCursor }}
    >
      {/* Floating Canvas Viewport Info Pill & Dimension Control & Preset Quick Zoom */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 p-1.5 px-3 rounded-2xl shadow-xl">
        {/* Interactive Dimension Control Button */}
        <div className="relative">
          <button
            onClick={() => setShowDimensionsMenu(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 hover:text-white transition-all cursor-pointer font-mono font-bold text-xs shadow-sm hover:scale-[1.02] active:scale-95"
            title="تعديل وتحديد مقاسات المشروع بحرية (العرض × الارتفاع)"
          >
            <Scaling size={13} className="text-indigo-400" />
            <span>{project.width} × {project.height} px</span>
            <ChevronDown size={11} className={`text-indigo-400/80 transition-transform ${showDimensionsMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Popover / Menu for Dimensions */}
          {showDimensionsMenu && (
            <div 
              className="absolute top-full left-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-4 z-50 text-right animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                    <Scaling size={13} className="text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">مقاس وأبعاد المشروع</span>
                    <span className="text-[9px] text-slate-400">تحكم كامل بحرية دون التقيد برقم معين</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDimensionsMenu(false)}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer transition-colors"
                  title="إغلاق"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Direct Custom Dimension Inputs */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 mb-1 block">العرض (Width):</label>
                    <div className="flex items-center bg-black/60 border border-indigo-400/30 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/50">
                      <input
                        type="number"
                        min={10}
                        max={8192}
                        value={customWidthInput}
                        onChange={(e) => {
                          const w = parseInt(e.target.value) || 0;
                          setCustomWidthInput(w);
                          if (lockRatio && project.width > 0 && w > 0) {
                            const ratio = project.height / project.width;
                            setCustomHeightInput(Math.round(w * ratio));
                          }
                        }}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none text-center"
                        placeholder="العرض"
                      />
                      <span className="text-[10px] text-indigo-400 font-mono">px</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 mb-1 block">الارتفاع (Height):</label>
                    <div className="flex items-center bg-black/60 border border-indigo-400/30 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/50">
                      <input
                        type="number"
                        min={10}
                        max={8192}
                        value={customHeightInput}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 0;
                          setCustomHeightInput(h);
                          if (lockRatio && project.height > 0 && h > 0) {
                            const ratio = project.width / project.height;
                            setCustomWidthInput(Math.round(h * ratio));
                          }
                        }}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none text-center"
                        placeholder="الارتفاع"
                      />
                      <span className="text-[10px] text-indigo-400 font-mono">px</span>
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Lock Toggle */}
                <div className="flex items-center justify-between px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setLockRatio(prev => !prev)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      lockRatio 
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200'
                    }`}
                  >
                    {lockRatio ? <Lock size={11} className="text-indigo-400" /> : <Unlock size={11} />}
                    <span>{lockRatio ? 'النسبة مقفلة (تناسب طردي)' : 'النسبة حرة (غير مقفلة)'}</span>
                  </button>
                  <span className="text-[9.5px] font-mono text-slate-400">
                    النسبة: {project.width && project.height ? (project.width / project.height).toFixed(2) : '1.00'}
                  </span>
                </div>

                {/* Quick Presets Grid */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">مقاسات سريعة شائعة:</span>
                    <span className="text-[9px] text-indigo-400 font-mono">نقرة واحدة للتطبيق</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-0.5">
                    {[
                      { label: '750 × 1334 (قصة / هاتف)', w: 750, h: 1334 },
                      { label: '1080 × 1920 (9:16 FHD)', w: 1080, h: 1920 },
                      { label: '500 × 500 (مربع افتراضي)', w: 500, h: 500 },
                      { label: '750 × 240 (بانر روم البث)', w: 750, h: 240 },
                      { label: '1920 × 1080 (16:9 شاشة)', w: 1920, h: 1080 },
                      { label: '1080 × 1080 (1:1 HD)', w: 1080, h: 1080 },
                      { label: '720 × 1280 (HD عمودي)', w: 720, h: 1280 },
                      { label: '400 × 400 (أيقونة / شارة)', w: 400, h: 400 }
                    ].map((p) => (
                      <button
                        key={`${p.w}x${p.h}`}
                        type="button"
                        onClick={() => {
                          setCustomWidthInput(p.w);
                          setCustomHeightInput(p.h);
                          if (onUpdateProjectDimensions) {
                            onUpdateProjectDimensions(p.w, p.h, scaleLayersWithResize);
                          }
                        }}
                        className={`text-right px-2 py-1.5 rounded-xl text-[10px] font-mono transition-all border cursor-pointer ${
                          project.width === p.w && project.height === p.h
                            ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5 hover:border-white/15'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options & Apply Button */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <label className="text-[10px] text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scaleLayersWithResize}
                      onChange={(e) => setScaleLayersWithResize(e.target.checked)}
                      className="rounded accent-indigo-500 cursor-pointer"
                    />
                    <span>تحجيم الطبقات تلقائياً</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateProjectDimensions && customWidthInput > 0 && customHeightInput > 0) {
                        onUpdateProjectDimensions(customWidthInput, customHeightInput, scaleLayersWithResize);
                        setShowDimensionsMenu(false);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Check size={13} />
                    <span>تطبيق المقاس</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-3 w-px bg-white/10" />
        <span className="text-[11px] font-mono text-indigo-400 font-bold">{zoom}%</span>

        <div className="h-3 w-px bg-white/10" />

        {/* Quick presets */}
        <div className="flex items-center gap-1">
          {[25, 50, 100, 200, 400, 800].map(pz => (
            <button
              key={pz}
              onClick={() => onZoomChange(pz)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer ${
                zoom === pz ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
              title={`مستوى التكبير ${pz}%`}
            >
              {pz}%
            </button>
          ))}
        </div>
      </div>

      {/* Floating Zoom & Reset Toolbar with Slider, Focus on Selection and Fit */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 p-1.5 px-2.5 rounded-2xl shadow-xl">
        <button
          onClick={() => onZoomChange(Math.max(10, zoom - 25))}
          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          title="تصغير (Zoom Out)"
        >
          <ZoomOut size={14} />
        </button>

        {/* Live Smooth Zoom Slider up to 800% */}
        <div className="flex items-center gap-1.5 w-24">
          <input
            type="range"
            min={10}
            max={800}
            step={10}
            value={zoom}
            onChange={(e) => onZoomChange(parseInt(e.target.value) || 100)}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            title={`مستوى التكبير: ${zoom}%`}
          />
        </div>

        <button
          onClick={() => {
            onZoomChange(100);
            onPanChange({ x: 0, y: 0 });
          }}
          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-mono font-bold text-slate-300 rounded-lg transition-colors cursor-pointer"
          title="إعادة ضبط الحجم (100%)"
        >
          100%
        </button>

        <button
          onClick={() => onZoomChange(Math.min(800, zoom + 25))}
          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          title="تكبير (Zoom In)"
        >
          <ZoomIn size={14} />
        </button>

        <div className="h-3 w-px bg-white/10 mx-0.5" />

        {/* Focus / Zoom to Selected Layer */}
        {selectedLayer && (
          <button
            onClick={handleZoomToSelection}
            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-[10px] font-bold text-purple-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-purple-500/30"
            title="تكبير والتركيز على الطبقة المحددة (Focus Selected Layer)"
          >
            <Focus size={12} />
            <span>تكبير على العنصر</span>
          </button>
        )}

        {/* Auto Fit to Screen Button */}
        <button
          onClick={() => {
            if (!containerRef.current) return;
            const cw = containerRef.current.clientWidth - 80;
            const ch = containerRef.current.clientHeight - 80;
            if (cw > 0 && ch > 0 && project.width > 0 && project.height > 0) {
              const sw = cw / project.width;
              const sh = ch / project.height;
              const fit = Math.max(10, Math.min(400, Math.round(Math.min(sw, sh) * 100)));
              onZoomChange(fit);
              onPanChange({ x: 0, y: 0 });
            }
          }}
          className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-[10px] font-bold text-indigo-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-indigo-500/30"
          title="ملاءمة الكانفاس لحجم الشاشة (Fit to View)"
        >
          <Maximize2 size={11} />
          <span>ملاءمة</span>
        </button>

        <button
          onClick={() => onPanChange({ x: 0, y: 0 })}
          className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          title="توسيط الكانفاس (Center Pan)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Active Selected Layer Banner */}
      {selectedLayer && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-indigo-500/30 text-indigo-300 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl text-xs" dir="rtl">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="font-bold text-white max-w-[180px] truncate">{selectedLayer.name}</span>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
            X:{Math.round(selectedLayer.transform.x)} Y:{Math.round(selectedLayer.transform.y)}
          </span>
          <button
            onClick={handleZoomToSelection}
            className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-[10px] font-bold text-indigo-200 hover:text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="تكبير الكانفاس على العنصر"
          >
            <Focus size={10} />
            <span>تكبير</span>
          </button>
        </div>
      )}

      {/* The Interactive Canvas Element */}
      <div
        className="relative transition-transform duration-75 shadow-2xl rounded-sm overflow-hidden"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
          width: `${project.width}px`,
          height: `${project.height}px`
        }}
      >
        <canvas
          ref={canvasRef}
          width={project.width}
          height={project.height}
          className="block pointer-events-none"
          style={{
            imageRendering: 'auto'
          }}
        />

        {/* Interactive Shine Vector Path Overlay on Canvas */}
        {selectedLayer?.shineConfig?.enabled && selectedLayer.shineConfig.editPathOnCanvas !== false && (() => {
          const sPt = tempShineStart || selectedLayer.shineConfig.startPoint || {
            x: Math.round(selectedLayer.transform.x + selectedLayer.transform.width / 2),
            y: Math.max(0, Math.round(selectedLayer.transform.y - 30))
          };
          const ePt = (shinePointStep === 'place-end' && hoverCanvasCoords) 
            ? hoverCanvasCoords 
            : (selectedLayer.shineConfig.endPoint || {
                x: Math.round(selectedLayer.transform.x + selectedLayer.transform.width / 2),
                y: Math.round(selectedLayer.transform.y + selectedLayer.transform.height + 30)
              });
          const mPt = { x: (sPt.x + ePt.x) / 2, y: (sPt.y + ePt.y) / 2 };
          const len = Math.round(Math.hypot(ePt.x - sPt.x, ePt.y - sPt.y));

          return (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible select-none"
              viewBox={`0 0 ${project.width} ${project.height}`}
            >
              <defs>
                <linearGradient id="shineVectorGrad" x1={sPt.x} y1={sPt.y} x2={ePt.x} y2={ePt.y} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="shinePinGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* Dashed trajectory line */}
              <line
                x1={sPt.x}
                y1={sPt.y}
                x2={ePt.x}
                y2={ePt.y}
                stroke="url(#shineVectorGrad)"
                strokeWidth="2.8"
                strokeDasharray="6 4"
              />

              {/* Middle Trajectory Drag Handle */}
              {shinePointStep === 'idle' && (
                <g transform={`translate(${mPt.x}, ${mPt.y})`} filter="url(#shinePinGlow)" className="pointer-events-auto cursor-grab">
                  <circle r="12" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  <path d="M-4 0 L4 0 M0 -4 L0 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <rect x="-42" y="16" width="84" height="20" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#06b6d4" strokeWidth="1.2" />
                  <text x="0" y="29.5" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    سحب ({len}px)
                  </text>
                </g>
              )}

              {/* Start Point Pin (Green) */}
              <g transform={`translate(${sPt.x}, ${sPt.y})`} filter="url(#shinePinGlow)" className="pointer-events-auto cursor-pointer">
                <circle r="14" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">
                  S
                </text>
                {/* Start Label Badge */}
                <rect x="-48" y="-28" width="96" height="20" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#10b981" strokeWidth="1.2" />
                <text x="0" y="-14.5" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  بداية اللمعة (Start)
                </text>
              </g>

              {/* End Point Pin (Purple) */}
              {(shinePointStep === 'idle' || shinePointStep === 'place-end') && (
                <g transform={`translate(${ePt.x}, ${ePt.y})`} filter="url(#shinePinGlow)" className="pointer-events-auto cursor-pointer">
                  <circle r="14" fill="#a855f7" stroke="#ffffff" strokeWidth="2.5" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">
                    E
                  </text>
                  {/* End Label Badge */}
                  <rect x="-48" y="-28" width="96" height="20" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#a855f7" strokeWidth="1.2" />
                  <text x="0" y="-14.5" textAnchor="middle" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    نهاية اللمعة (End)
                  </text>
                </g>
              )}
            </svg>
          );
        })()}
      </div>

      {/* Floating Guidance Banner when placing Shine Points */}
      {shinePointStep !== 'idle' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 border border-emerald-500/60 shadow-2xl px-5 py-3 rounded-2xl backdrop-blur-md text-white animate-in slide-in-from-top-2 duration-150">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm font-bold text-emerald-300">
            {shinePointStep === 'place-start' 
              ? '📌 الخطوة 1: انقر بالماوس على المكان الذي تبدأ منه حركة اللمعة (نقطة البداية S)' 
              : '🎯 الخطوة 2: انقر بالماوس على المكان الذي تريد أن تصل إليه اللمعة (نقطة النهاية E)'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShinePointStep('idle');
              setTempShineStart(null);
            }}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Interactive Smart Chroma Magnifier Loupe */}
      {activeTool === 'chroma-pen' && chromaLoupe && (
        <div 
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 flex flex-col items-center animate-in fade-in zoom-in-90 duration-75"
          style={{
            left: `${chromaLoupe.clientX}px`,
            top: `${chromaLoupe.clientY - 16}px`
          }}
        >
          {/* Loupe Outer Glow Ring */}
          <div 
            className="relative w-20 h-20 rounded-full border-[3px] shadow-2xl overflow-hidden flex items-center justify-center bg-black/95 ring-2 ring-white/20"
            style={{
              borderColor: chromaLoupe.color.hex,
              boxShadow: `0 0 24px ${chromaLoupe.color.hex}99, 0 10px 30px rgba(0,0,0,0.85)`
            }}
          >
            {/* Precision Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-full h-px bg-white/70" />
              <div className="h-full w-px bg-white/70 absolute" />
              <div className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" />
            </div>

            {/* Target Color Swatch fill */}
            <div 
              className="w-full h-full"
              style={{ backgroundColor: chromaLoupe.color.hex }}
            />
          </div>

          {/* Color Pill Tag */}
          <div className="mt-2 flex flex-col items-center bg-slate-950/95 border border-white/20 px-3 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md text-center ring-1 ring-emerald-500/30">
            <div className="flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: chromaLoupe.color.hex }}
              />
              <span className="font-mono text-xs font-black text-white">{chromaLoupe.color.hex}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
              {identifyColorType(chromaLoupe.color.r, chromaLoupe.color.g, chromaLoupe.color.b).label}
            </span>
            <span className="text-[9px] text-slate-300 font-medium">انقر بالماوس لحذف هذا اللون</span>
          </div>
        </div>
      )}

      {/* Floating Canvas Top Stage Controls Bar for Freehand Pen Cutout Tool */}
      {(isChromaPenActive || activeTool === 'chroma-pen') && chromaSubMode !== 'picker' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-emerald-500/50 backdrop-blur-2xl rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-white shadow-2xl text-xs select-none animate-in fade-in slide-in-from-top-4 duration-150 flex-wrap justify-center ring-1 ring-emerald-400/30" dir="rtl">
          <div className="flex items-center gap-1.5 font-black text-emerald-300">
            <PenTool size={15} />
            <span className="text-xs">قلم القص والتفريغ المباشر</span>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* SubTool Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => onPenToolChange?.('brush')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaPenTool === 'brush' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="فرشاة رسم حر"
            >
              <Brush size={13} />
              <span>فرشاة</span>
            </button>
            <button
              type="button"
              onClick={() => onPenToolChange?.('lasso')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaPenTool === 'lasso' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="تحديد لاسو حر"
            >
              <Lasso size={13} />
              <span>لاسو</span>
            </button>
            <button
              type="button"
              onClick={() => onPenToolChange?.('rect')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaPenTool === 'rect' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="تحديد مستطيل"
            >
              <Square size={12} />
              <span>مستطيل</span>
            </button>
            <button
              type="button"
              onClick={() => onPenToolChange?.('circle')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaPenTool === 'circle' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="تحديد دائري"
            >
              <Circle size={12} />
              <span>دائري</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Mask Mode: Erase vs Keep */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => onMaskModeChange?.('erase')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaMaskMode === 'erase' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser size={13} />
              <span>تفريغ (قص)</span>
            </button>
            <button
              type="button"
              onClick={() => onMaskModeChange?.('keep')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                chromaMaskMode === 'keep' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scissors size={13} />
              <span>عزل (إبقاء)</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Size Slider */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-300 font-bold">الحجم:</span>
            <input
              type="range"
              min={5}
              max={120}
              value={chromaBrushSize || 30}
              onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
              className="w-20 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-emerald-300 font-bold text-[10px]">{chromaBrushSize || 30}px</span>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {penStrokes && penStrokes.length > 0 && (
              <button
                type="button"
                onClick={onUndoPenStroke}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                title="تراجع عن آخر خطوة"
              >
                <RotateCcw size={14} />
              </button>
            )}
            {penStrokes && penStrokes.length > 0 && (
              <button
                type="button"
                onClick={onClearPenStrokes}
                className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                title="مسح كافة التحديدات"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onApplyPenMask}
              disabled={!penStrokes || penStrokes.length === 0}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Check size={14} />
              <span>تطبيق القص المباشر ({penStrokes?.length || 0})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
