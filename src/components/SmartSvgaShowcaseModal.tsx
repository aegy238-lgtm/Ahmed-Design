import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Copy, Sparkles, RefreshCw, Move, Layers, Grid, 
  LayoutGrid, Sliders, Palette, Type, Check, Upload, Eye, EyeOff,
  ZoomIn, ZoomOut, RotateCw, Trash2, ShieldCheck, Heart, Package,
  Maximize2, Plus, ArrowUp, ArrowDown, FileImage, Image as ImageIcon
} from 'lucide-react';
import pako from 'pako';
import { parse } from 'protobufjs';
import { svgaSchema } from '../svga-proto';

// Item layout inside the showcase
export interface ShowcaseGiftItem {
  id: string;
  name: string;
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  category?: 'hero' | 'frame' | 'banner' | 'badge' | 'card' | 'normal';
}

export type SmartLayoutPreset = 
  | 'vip_showcase'       // Exact layout of Screenshot_2026-10-20_143022_04a1f7b7.png (Tall heroes left, frames/banners right)
  | 'gold_catalog'        // Exact layout of VIP_GIFT_PACK_Showcase__6__0819bbf8.png (2x3 or 3x3 gold luxury grid with tags)
  | 'podium_hierarchy'   // Podium center hero with tiered side wings
  | 'horizontal_banner'  // Panoramic showcase strip
  | 'vertical_story'     // 9:16 mobile story
  | 'auto_flow';         // Dynamic grid

interface SmartSvgaShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    id: string;
    name: string;
    file?: File;
    url?: string;
    dimensions?: { width: number; height: number };
    frames?: number;
    fps?: number;
    type?: string;
    coverBlob?: Blob;
    videoItem?: any;
    [key: string]: any;
  }>;
  onCaptureFrame?: (item: any) => Promise<Blob>;
}

// Background themes matching user screenshots
const BG_THEMES = [
  { 
    id: 'vip_midnight', 
    name: 'أزرق ليلي ملكي (VIP Midnight - مثل صورة الذئب والعرش)', 
    class: 'bg-gradient-to-br from-[#060b17] via-[#091228] to-[#040814]', 
    border: 'border-blue-500/40',
    type: 'dark'
  },
  { 
    id: 'gold_luxury', 
    name: 'كاربون ذهبي فاخر (VIP Gold - مثل صورة VIP 15)', 
    class: 'bg-gradient-to-br from-[#080c14] via-[#0d1422] to-[#05080f]', 
    border: 'border-amber-500/50',
    type: 'dark'
  },
  { 
    id: 'royal_sapphire', 
    name: 'أزرق ياقوتي ملوكي (Royal Sapphire)', 
    class: 'bg-gradient-to-br from-[#050c1e] via-[#091838] to-[#040814]', 
    border: 'border-blue-500/40',
    type: 'dark'
  },
  { 
    id: 'cyber_neon', 
    name: 'نيون بنفسجي سايبر (Cyber Glow)', 
    class: 'bg-gradient-to-br from-[#120722] via-[#1f0b3d] to-[#08020e]', 
    border: 'border-purple-500/40',
    type: 'dark'
  },
  { 
    id: 'studio_clean', 
    name: 'استوديو ناصع فاتح (Studio White)', 
    class: 'bg-gradient-to-br from-slate-100 via-white to-slate-200', 
    border: 'border-slate-300',
    type: 'light'
  },
  { 
    id: 'transparent', 
    name: 'شفافة بدون خلفية (Transparent PNG)', 
    class: 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950/90', 
    border: 'border-dashed border-white/20',
    type: 'transparent'
  }
];

// Helper: Trim transparent borders around canvas so items don't have misleading empty bounding boxes
function trimTransparentCanvas(sourceCanvas: HTMLCanvasElement): { canvas: HTMLCanvasElement; width: number; height: number } {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas: sourceCanvas, width: sourceCanvas.width, height: sourceCanvas.height };

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  if (w <= 0 || h <= 0) return { canvas: sourceCanvas, width: w, height: h };

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = new Uint32Array(imgData.data.buffer);

    let top = -1, bottom = -1, left = -1, right = -1;

    // Scan top
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((data[y * w + x] & 0xFF000000) !== 0) {
          top = y;
          break;
        }
      }
      if (top !== -1) break;
    }

    if (top === -1) {
      // Entirely transparent
      return { canvas: sourceCanvas, width: w, height: h };
    }

    // Scan bottom
    for (let y = h - 1; y >= top; y--) {
      for (let x = 0; x < w; x++) {
        if ((data[y * w + x] & 0xFF000000) !== 0) {
          bottom = y;
          break;
        }
      }
      if (bottom !== -1) break;
    }

    // Scan left
    for (let x = 0; x < w; x++) {
      for (let y = top; y <= bottom; y++) {
        if ((data[y * w + x] & 0xFF000000) !== 0) {
          left = x;
          break;
        }
      }
      if (left !== -1) break;
    }

    // Scan right
    for (let x = w - 1; x >= left; x--) {
      for (let y = top; y <= bottom; y++) {
        if ((data[y * w + x] & 0xFF000000) !== 0) {
          right = x;
          break;
        }
      }
      if (right !== -1) break;
    }

    const trimW = right - left + 1;
    const trimH = bottom - top + 1;

    // Add 4px padding so edges don't get clipped
    const pad = 4;
    const finalW = trimW + pad * 2;
    const finalH = trimH + pad * 2;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = finalW;
    trimmedCanvas.height = finalH;
    const tCtx = trimmedCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(sourceCanvas, left, top, trimW, trimH, pad, pad, trimW, trimH);
      return { canvas: trimmedCanvas, width: finalW, height: finalH };
    }
  } catch (e) {
    // If CORS or error, return original
  }

  return { canvas: sourceCanvas, width: w, height: h };
}

// Helper: Measure real intrinsic image width & height from a dataUrl/Blob
async function measureImageIntrinsicSize(src: string): Promise<{ width: number; height: number; trimmedDataUrl: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 500;
        c.height = img.naturalHeight || 500;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const trimmed = trimTransparentCanvas(c);
          resolve({
            width: trimmed.width,
            height: trimmed.height,
            trimmedDataUrl: trimmed.canvas.toDataURL('image/png')
          });
          return;
        }
      } catch (e) {}
      resolve({
        width: img.naturalWidth || 500,
        height: img.naturalHeight || 500,
        trimmedDataUrl: src
      });
    };
    img.onerror = () => {
      resolve({ width: 500, height: 500, trimmedDataUrl: src });
    };
    img.src = src;
  });
}

export const SmartSvgaShowcaseModal: React.FC<SmartSvgaShowcaseModalProps> = ({
  isOpen,
  onClose,
  items,
  onCaptureFrame
}) => {
  // Showcase canvas dimensions (16:9 standard ultra-sharp 1920x1080)
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  // Processing state
  const [loadingProgress, setLoadingProgress] = useState<number>(100);
  const [giftItems, setGiftItems] = useState<ShowcaseGiftItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Layout & Styling state
  const [activePreset, setActivePreset] = useState<SmartLayoutPreset>('vip_showcase');
  const [bgTheme, setBgTheme] = useState<string>('vip_midnight');

  // Decorative overlays & titles matching reference photos
  const [showGoldBorders, setShowGoldBorders] = useState<boolean>(true); // Gold double frame like VIP 15
  const [showVipTitle, setShowVipTitle] = useState<boolean>(true);       // VIP GIFT PACK header like VIP 15
  const [vipMainTitle, setVipMainTitle] = useState<string>('VIP GIFT PACK');
  const [vipSubTitle, setVipSubTitle] = useState<string>('مجموعة الهدايا والإطارات الحصرية ★ EXCLUSIVE ASSET SHOWCASE ★');
  
  // Pack Badge (PACK · 42) & Top Heart Icon (like Screenshot 143022)
  const [packBadgeText, setPackBadgeText] = useState<string>('PACK · 42');
  const [packBadgeColor, setPackBadgeColor] = useState<'lime' | 'gold' | 'cyan' | 'pink'>('lime');
  const [showPackBadge, setShowPackBadge] = useState<boolean>(false);
  const [showHeartIcon, setShowHeartIcon] = useState<boolean>(false);
  const [showItemLabels, setShowItemLabels] = useState<boolean>(true); // Asset name tags underneath

  // Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('VIP ASSET PACK');

  // Interactive dragging / transforming
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'webp' | 'png' | 'jpeg'>('webp');
  const [exportMultiplier, setExportMultiplier] = useState<number>(2); // 1x = 1080p, 2x = 4K Ultra HD
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // File input ref for opening & uploading assets directly
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Snapshot cache to prevent redundant work
  const snapshotCache = useRef<Map<string, { dataUrl: string; width: number; height: number }>>(new Map());

  // Ultra-Fast Snapshot Extraction Helper (Instant from DOM or decoded memory)
  const fastExtractItemSnapshot = useCallback(async (raw: any): Promise<{ dataUrl: string; width: number; height: number }> => {
    const cacheKey = raw.id || raw.name || (raw.file ? `${raw.file.name}_${raw.file.size}` : '');
    if (cacheKey && snapshotCache.current.has(cacheKey)) {
      return snapshotCache.current.get(cacheKey)!;
    }

    let naturalW = raw.dimensions?.width || 500;
    let naturalH = raw.dimensions?.height || 500;

    // 1. Check if raw item already carries a coverBlob or pre-rendered URL
    if (raw.coverBlob) {
      try {
        const url = URL.createObjectURL(raw.coverBlob);
        const measured = await measureImageIntrinsicSize(url);
        const result = { dataUrl: measured.trimmedDataUrl, width: measured.width, height: measured.height };
        if (cacheKey) snapshotCache.current.set(cacheKey, result);
        return result;
      } catch (e) {}
    }

    // 2. INSTANT DOM CANVAS GRAB (<1ms): If already rendered in MultiSvgaViewer, grab it!
    if (raw.id) {
      const container = document.getElementById(`svga-container-${raw.id}`) || document.querySelector(`[data-svga-id="${raw.id}"]`);
      if (container) {
        const domCanvas = container.querySelector('canvas') as HTMLCanvasElement;
        if (domCanvas && domCanvas.width > 0 && domCanvas.height > 0) {
          try {
            const trimmed = trimTransparentCanvas(domCanvas);
            const dataUrl = trimmed.canvas.toDataURL('image/png');
            if (dataUrl && dataUrl.length > 200) {
              const result = { dataUrl, width: trimmed.width, height: trimmed.height };
              if (cacheKey) snapshotCache.current.set(cacheKey, result);
              return result;
            }
          } catch (e) {}
        }
      }
    }

    // 3. From parsed raw.file (Images: PNG, WEBP, JPG, SVG, GIF)
    if (raw.file) {
      const name = raw.file.name?.toLowerCase() || '';
      if (raw.file.type?.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif)$/i.test(name)) {
        try {
          const rawUrl = URL.createObjectURL(raw.file);
          const measured = await measureImageIntrinsicSize(rawUrl);
          const result = { dataUrl: measured.trimmedDataUrl, width: measured.width, height: measured.height };
          if (cacheKey) snapshotCache.current.set(cacheKey, result);
          return result;
        } catch (e) {}
      }
    }

    // 4. FAST IN-MEMORY PROTOBUF/PAKO EXTRACTION FOR SVGA
    if (raw.file) {
      try {
        const buffer = await raw.file.arrayBuffer();
        let decompressed = new Uint8Array(buffer);
        try {
          decompressed = pako.inflate(decompressed);
        } catch {
          try { decompressed = pako.inflateRaw(decompressed); } catch {}
        }

        const root = parse(svgaSchema).root;
        const MovieEntity = root.lookupType('com.opensource.svga.MovieEntity');
        const decoded: any = MovieEntity.decode(decompressed);

        if (decoded && decoded.images) {
          let maxLen = 0;
          let bestBytes: Uint8Array | null = null;
          for (const k of Object.keys(decoded.images)) {
            const rawBytes = decoded.images[k];
            if (rawBytes && rawBytes.length > maxLen) {
              maxLen = rawBytes.length;
              bestBytes = rawBytes;
            }
          }
          if (bestBytes) {
            const blobUrl = URL.createObjectURL(new Blob([bestBytes], { type: 'image/png' }));
            const measured = await measureImageIntrinsicSize(blobUrl);
            const result = { dataUrl: measured.trimmedDataUrl, width: measured.width, height: measured.height };
            if (cacheKey) snapshotCache.current.set(cacheKey, result);
            return result;
          }
        }
      } catch (e) {}
    }

    // 5. Fast bounded onCaptureFrame fallback
    if (onCaptureFrame) {
      try {
        const capturePromise = onCaptureFrame(raw);
        const timeoutPromise = new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
        const blob = await Promise.race([capturePromise, timeoutPromise]);
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const measured = await measureImageIntrinsicSize(url);
          const result = { dataUrl: measured.trimmedDataUrl, width: measured.width, height: measured.height };
          if (cacheKey) snapshotCache.current.set(cacheKey, result);
          return result;
        }
      } catch (e) {}
    }

    // 6. Fallback placeholder
    return {
      dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" rx="24" fill="%230b1022"/><text x="150" y="160" fill="%23f59e0b" font-size="20" font-weight="900" text-anchor="middle" font-family="sans-serif">VIP GIFT</text></svg>',
      width: 500,
      height: 500
    };
  }, [onCaptureFrame]);

  // STRICT ASPECT RATIO PRESERVATION: Fits an item inside a box without squishing, shrinking, or stretching
  const fitInsideBox = (item: ShowcaseGiftItem, boxX: number, boxY: number, boxW: number, boxH: number) => {
    const ratio = (item.originalWidth > 0 && item.originalHeight > 0) 
      ? item.originalWidth / item.originalHeight 
      : 1;
    const boxRatio = boxW / boxH;

    let actualW = boxW;
    let actualH = boxH;
    if (ratio > boxRatio) {
      // Wider than box: match width, compute height
      actualH = Math.round(boxW / ratio);
    } else {
      // Taller than box: match height, compute width
      actualW = Math.round(boxH * ratio);
    }

    // Center cleanly inside the slot
    item.x = Math.round(boxX + (boxW - actualW) / 2);
    item.y = Math.round(boxY + (boxH - actualH) / 2);
    item.width = Math.round(actualW);
    item.height = Math.round(actualH);
  };

  // Compute Layout Positions according to Preset with STRICT aspect ratio preservation
  const applyPresetLayout = useCallback((preset: SmartLayoutPreset, currentItems: ShowcaseGiftItem[]) => {
    if (currentItems.length === 0) return currentItems;

    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const updated = [...currentItems];

    if (preset === 'vip_showcase') {
      // PRECISE RECREATION OF USER'S REFERENCE IMAGE (Screenshot_2026-10-20_143022_04a1f7b7.png):
      // - Left Side: 1 or 2 tall vertical cards side-by-side (e.g. Wolf Gift & Royal Throne / Room Entry)
      // - Right Side:
      //    * Top Row: Avatar Frame (square/circle) + Royal Crest/Shield
      //    * Middle Row: Wide Chat / Entry Banner
      //    * Bottom Row: 3 compact badges (Card/stage, VIP text pill, mini badge)

      const tallItems: ShowcaseGiftItem[] = [];
      const wideItems: ShowcaseGiftItem[] = [];
      const squareItems: ShowcaseGiftItem[] = [];
      const otherItems: ShowcaseGiftItem[] = [];

      updated.forEach((item) => {
        const ratio = (item.originalWidth > 0 && item.originalHeight > 0) 
          ? item.originalWidth / item.originalHeight 
          : 1;
        if (ratio <= 0.85) {
          tallItems.push(item);
        } else if (ratio >= 1.6) {
          wideItems.push(item);
        } else if (ratio > 0.85 && ratio <= 1.35) {
          squareItems.push(item);
        } else {
          otherItems.push(item);
        }
      });

      // If no item was classified as tall, assign the first item as tall hero
      if (tallItems.length === 0 && updated.length > 0) {
        tallItems.push(updated[0]);
      }

      const placedSet = new Set<string>();

      // 1. PLACE TALL HERO GIFTS ON THE LEFT STAGE:
      const numTall = Math.min(2, tallItems.length);
      for (let t = 0; t < numTall; t++) {
        const item = tallItems[t];
        placedSet.add(item.id);
        item.zIndex = 15;
        item.scale = 1.0;
        item.rotation = 0;
        item.category = 'hero';

        if (numTall === 1) {
          fitInsideBox(item, 70, 50, 720, 980);
        } else {
          const slotW = 390;
          fitInsideBox(item, 50 + t * (slotW + 30), 50, slotW, 980);
        }
      }

      // Right zone starts at x: 890, width: 980, height: 980
      const rightX = 900;
      const rightW = 960;

      const rightPool = updated.filter(item => !placedSet.has(item.id));

      // 2. TOP RIGHT ROW: Avatar Frame + VIP Crest/Medal (2 items side-by-side)
      const topRowItems = rightPool.filter(i => squareItems.includes(i)).slice(0, 2);
      if (topRowItems.length < 2) {
        for (const item of rightPool) {
          if (!topRowItems.includes(item) && topRowItems.length < 2) {
            topRowItems.push(item);
          }
        }
      }

      topRowItems.forEach((item, idx) => {
        placedSet.add(item.id);
        item.zIndex = 12;
        item.scale = 1.0;
        item.rotation = 0;
        item.category = 'frame';
        const slotW = 450;
        const slotH = 400;
        fitInsideBox(item, rightX + idx * (slotW + 40), 50, slotW, slotH);
      });

      // 3. MIDDLE RIGHT ROW: Wide Horizontal Chat/Entry Banner (1 wide item across)
      const midRowItem = rightPool.find(i => wideItems.includes(i) && !placedSet.has(i.id)) 
        || rightPool.find(i => !placedSet.has(i.id));

      if (midRowItem) {
        placedSet.add(midRowItem.id);
        midRowItem.zIndex = 10;
        midRowItem.scale = 1.0;
        midRowItem.rotation = 0;
        midRowItem.category = 'banner';
        fitInsideBox(midRowItem, rightX + 50, 480, 860, 200);
      }

      // 4. BOTTOM RIGHT ROW: 3 Compact Badges / Chat Bubbles / Mini Tags
      const bottomPool = rightPool.filter(i => !placedSet.has(i.id));
      const numBottom = Math.min(3, bottomPool.length);
      const bSlotW = (rightW - (Math.max(1, numBottom) - 1) * 30) / Math.max(1, numBottom);

      for (let b = 0; b < numBottom; b++) {
        const item = bottomPool[b];
        placedSet.add(item.id);
        item.zIndex = 8;
        item.scale = 1.0;
        item.rotation = 0;
        item.category = 'badge';
        fitInsideBox(item, rightX + b * (bSlotW + 30), 710, bSlotW, 280);
      }

      // Any remaining items distributed cleanly
      const extraItems = updated.filter(i => !placedSet.has(i.id));
      extraItems.forEach((item, exIdx) => {
        item.zIndex = 5;
        item.scale = 0.9;
        item.rotation = 0;
        fitInsideBox(item, 80 + exIdx * 190, 820, 170, 170);
      });

    } else if (preset === 'gold_catalog') {
      // PRECISE RECREATION OF VIP_GIFT_PACK_Showcase__6__0819bbf8.png:
      // 2x3 or 3x3 Luxury Grid with balanced slots, double gold borders, asset name tags
      const count = updated.length;
      const cols = count <= 2 ? 2 : count <= 4 ? 2 : count <= 6 ? 3 : count <= 8 ? 4 : count <= 12 ? 4 : count <= 20 ? 5 : 6;
      const rows = Math.ceil(count / cols);
      const paddingX = 80;
      const paddingY = showVipTitle ? 130 : 80;
      const availableW = W - paddingX * 2;
      const availableH = H - paddingY - 80;
      const gapX = count > 15 ? 16 : 28;
      const gapY = count > 15 ? 16 : 32;
      const cellW = (availableW - (cols - 1) * gapX) / cols;
      const cellH = (availableH - (rows - 1) * gapY) / rows;

      updated.forEach((item, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        item.scale = 0.96;
        item.rotation = 0;
        item.zIndex = idx + 1;
        fitInsideBox(item, paddingX + c * (cellW + gapX), paddingY + r * (cellH + gapY), cellW, cellH);
      });

    } else if (preset === 'podium_hierarchy') {
      const heroW = W * 0.40;
      const heroH = H * 0.72;

      updated.forEach((item, idx) => {
        if (idx === 0) {
          item.scale = 1.05;
          item.rotation = 0;
          item.zIndex = 20;
          item.category = 'hero';
          fitInsideBox(item, (W - heroW) / 2, H * 0.16, heroW, heroH);
        } else {
          const isLeft = idx % 2 === 1;
          const tier = Math.ceil(idx / 2);
          const sideW = W * 0.22;
          const sideH = H * 0.36;
          const sideX = isLeft ? W * 0.05 + (tier - 1) * 20 : W * 0.73 - (tier - 1) * 20;
          const sideY = Math.min(H - sideH - 40, H * 0.22 + (tier - 1) * 90);

          item.scale = 0.9;
          item.rotation = isLeft ? -2 : 2;
          item.zIndex = 10 - tier;
          fitInsideBox(item, sideX, sideY, sideW, sideH);
        }
      });

    } else if (preset === 'horizontal_banner') {
      const count = updated.length;
      const paddingX = 70;
      const gap = count > 15 ? 10 : 24;
      const availableW = W - paddingX * 2;
      const itemW = (availableW - (count - 1) * gap) / Math.max(1, count);
      const itemH = H * 0.75;

      updated.forEach((item, idx) => {
        item.scale = 0.96;
        item.rotation = 0;
        item.zIndex = idx + 1;
        fitInsideBox(item, paddingX + idx * (itemW + gap), H * 0.15, itemW, itemH);
      });

    } else if (preset === 'vertical_story') {
      const count = updated.length;
      const paddingY = 90;
      const availableH = H - paddingY * 2;
      const gap = 18;
      const itemH = (availableH - (count - 1) * gap) / Math.max(1, count);
      const itemW = W * 0.52;

      updated.forEach((item, idx) => {
        item.scale = 0.96;
        item.rotation = 0;
        item.zIndex = idx + 1;
        fitInsideBox(item, (W - itemW) / 2, paddingY + idx * (itemH + gap), itemW, itemH);
      });

    } else if (preset === 'auto_flow') {
      const count = updated.length;
      const cols = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(count))));
      const rows = Math.ceil(count / cols);
      const padding = 60;
      const cw = (W - padding * 2) / cols;
      const ch = (H - padding * 2) / rows;

      updated.forEach((item, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        item.scale = 0.96;
        item.rotation = 0;
        item.zIndex = idx + 1;
        fitInsideBox(item, padding + c * cw + 10, padding + r * ch + 10, cw - 20, ch - 20);
      });
    }

    return updated;
  }, [showVipTitle]);

  // Parallel Hydration on Open: Fast, non-blocking snapshot resolution with caching
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const total = items.length;

    if (total === 0) {
      setLoadingProgress(100);
      return;
    }

    // Step 1: Initialize items immediately with their known or default aspect ratio
    const initialItems: ShowcaseGiftItem[] = items.map((raw, i) => {
      const ow = raw.dimensions?.width || 500;
      const oh = raw.dimensions?.height || 500;
      return {
        id: raw.id || `gift_${i}_${Date.now()}`,
        name: raw.name ? raw.name.replace(/\.[^/.]+$/, '') : `هدية ${i + 1}`,
        dataUrl: '',
        originalWidth: ow,
        originalHeight: oh,
        x: 0,
        y: 0,
        width: 320,
        height: 320,
        scale: 1.0,
        rotation: 0,
        zIndex: i + 1,
        visible: true,
        category: i === 0 ? 'hero' : 'normal'
      };
    });

    const positioned = applyPresetLayout(activePreset, initialItems);
    setGiftItems(positioned);
    if (positioned.length > 0) {
      setSelectedItemId(positioned[0].id);
    }
    setLoadingProgress(15);

    // Step 2: Extract snapshots in high-concurrency batches of 8 in parallel
    const processInParallel = async () => {
      const BATCH_SIZE = 8;
      let completedCount = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        if (!isMounted) break;
        const currentBatch = items.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
          currentBatch.map(async (raw) => {
            const extracted = await fastExtractItemSnapshot(raw);
            return { id: raw.id, ...extracted };
          })
        );

        if (!isMounted) break;

        completedCount += currentBatch.length;
        setLoadingProgress(Math.min(100, Math.round((completedCount / total) * 100)));

        // Live update images with exact intrinsic dimensions
        setGiftItems((prev) => {
          const updatedList = prev.map((item) => {
            const match = results.find((r) => r.id === item.id);
            if (match && match.dataUrl) {
              const ow = match.width || item.originalWidth;
              const oh = match.height || item.originalHeight;
              return { ...item, dataUrl: match.dataUrl, originalWidth: ow, originalHeight: oh };
            }
            return item;
          });
          return applyPresetLayout(activePreset, updatedList);
        });
      }
    };

    processInParallel();

    return () => {
      isMounted = false;
    };
  }, [isOpen, items, fastExtractItemSnapshot, applyPresetLayout, activePreset]);

  // Switch Preset Handler
  const handleSelectPreset = (preset: SmartLayoutPreset) => {
    setActivePreset(preset);
    if (preset === 'gold_catalog') {
      setShowGoldBorders(true);
      setShowVipTitle(true);
      setShowItemLabels(true);
    }
    setGiftItems(prev => applyPresetLayout(preset, prev));
  };

  // Re-order or Bring To Front
  const bringToFront = (id: string) => {
    setGiftItems(prev => {
      const maxZ = Math.max(...prev.map(i => i.zIndex), 0);
      return prev.map(item => item.id === id ? { ...item, zIndex: maxZ + 1 } : item);
    });
  };

  const sendToBack = (id: string) => {
    setGiftItems(prev => {
      const minZ = Math.min(...prev.map(i => i.zIndex), 0);
      return prev.map(item => item.id === id ? { ...item, zIndex: Math.max(1, minZ - 1) } : item);
    });
  };

  // Update selected item attribute
  const updateSelectedItem = (changes: Partial<ShowcaseGiftItem>) => {
    if (!selectedItemId) return;
    setGiftItems(prev => prev.map(item => item.id === selectedItemId ? { ...item, ...changes } : item));
  };

  // Delete selected item from collage
  const handleDeleteItem = (id: string) => {
    setGiftItems(prev => prev.filter(i => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Dragging support inside the interactive workspace
  const handleItemMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedItemId(id);
    setIsDragging(true);

    const item = giftItems.find(i => i.id === id);
    if (!item) return;

    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleFactor = CANVAS_WIDTH / rect.width;
    const mouseCanvasX = (e.clientX - rect.left) * scaleFactor;
    const mouseCanvasY = (e.clientY - rect.top) * scaleFactor;

    setDragOffset({
      x: mouseCanvasX - item.x,
      y: mouseCanvasY - item.y
    });
  };

  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedItemId) return;

    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleFactor = CANVAS_WIDTH / rect.width;
    const mouseCanvasX = (e.clientX - rect.left) * scaleFactor;
    const mouseCanvasY = (e.clientY - rect.top) * scaleFactor;

    const newX = Math.round(mouseCanvasX - dragOffset.x);
    const newY = Math.round(mouseCanvasY - dragOffset.y);

    setGiftItems(prev => prev.map(item => {
      if (item.id === selectedItemId) {
        return {
          ...item,
          x: Math.max(-item.width * 0.5, Math.min(CANVAS_WIDTH - item.width * 0.5, newX)),
          y: Math.max(-item.height * 0.5, Math.min(CANVAS_HEIGHT - item.height * 0.5, newY))
        };
      }
      return item;
    }));
  };

  const handleWorkspaceMouseUp = () => {
    setIsDragging(false);
  };

  // RENDER CANVAS TO BLOB: Pure WYSIWYG matching DOM exactly
  const renderCanvasToBlob = async (format: 'webp' | 'png' | 'jpeg', scaleMultiplier: number = 2): Promise<Blob> => {
    const W = CANVAS_WIDTH * scaleMultiplier;
    const H = CANVAS_HEIGHT * scaleMultiplier;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw Background Theme
    if (bgTheme === 'transparent') {
      ctx.clearRect(0, 0, W, H);
    } else if (bgTheme === 'vip_midnight') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#060b17');
      grad.addColorStop(0.5, '#091228');
      grad.addColorStop(1, '#040814');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Celestial radial blue glow
      const radial = ctx.createRadialGradient(W * 0.38, H * 0.45, 50, W * 0.38, H * 0.45, W * 0.65);
      radial.addColorStop(0, 'rgba(59, 130, 246, 0.16)');
      radial.addColorStop(0.7, 'rgba(14, 165, 233, 0.05)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, W, H);

      // Ambient stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      const starCoords = [[0.12, 0.22], [0.42, 0.16], [0.78, 0.22], [0.88, 0.45], [0.22, 0.68], [0.65, 0.88]];
      for (const [sx, sy] of starCoords) {
        ctx.beginPath();
        ctx.arc(sx * W, sy * H, 2 * scaleMultiplier, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bgTheme === 'gold_luxury') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#080c14');
      grad.addColorStop(0.5, '#0d1422');
      grad.addColorStop(1, '#05080f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (bgTheme === 'royal_sapphire') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#050c1e');
      grad.addColorStop(0.5, '#091838');
      grad.addColorStop(1, '#040814');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (bgTheme === 'cyber_neon') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#120722');
      grad.addColorStop(0.5, '#1f0b3d');
      grad.addColorStop(1, '#08020e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Gold Luxury Double Borders matching VIP 15 reference photo
    if (showGoldBorders && bgTheme !== 'transparent') {
      ctx.save();
      // Outer border
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3 * scaleMultiplier;
      ctx.strokeRect(18 * scaleMultiplier, 18 * scaleMultiplier, W - 36 * scaleMultiplier, H - 36 * scaleMultiplier);

      // Inner thin border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 1.5 * scaleMultiplier;
      ctx.strokeRect(26 * scaleMultiplier, 26 * scaleMultiplier, W - 52 * scaleMultiplier, H - 52 * scaleMultiplier);
      ctx.restore();
    }

    // 3. VIP Main Title Header matching VIP 15 reference photo
    if (showVipTitle && vipMainTitle && bgTheme !== 'transparent') {
      ctx.save();
      ctx.textAlign = 'right';

      // Title Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12 * scaleMultiplier;
      ctx.shadowOffsetX = 2 * scaleMultiplier;
      ctx.shadowOffsetY = 4 * scaleMultiplier;

      // Gold Gradient Title Text
      const titleGrad = ctx.createLinearGradient(W - 400 * scaleMultiplier, 50 * scaleMultiplier, W - 50 * scaleMultiplier, 90 * scaleMultiplier);
      titleGrad.addColorStop(0, '#fef08a');
      titleGrad.addColorStop(0.5, '#facc15');
      titleGrad.addColorStop(1, '#ca8a04');

      ctx.fillStyle = titleGrad;
      ctx.font = `900 ${36 * scaleMultiplier}px 'Tajawal', sans-serif`;
      ctx.fillText(vipMainTitle, W - 50 * scaleMultiplier, 72 * scaleMultiplier);

      if (vipSubTitle) {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#fef08a';
        ctx.font = `bold ${15 * scaleMultiplier}px 'Tajawal', sans-serif`;
        ctx.fillText(vipSubTitle, W - 50 * scaleMultiplier, 102 * scaleMultiplier);
      }
      ctx.restore();
    }

    // 4. Draw Top Left Pill Badge: "📦 PACK · 42"
    if (showPackBadge && packBadgeText) {
      ctx.save();
      const badgeX = 50 * scaleMultiplier;
      const badgeY = 35 * scaleMultiplier;
      const badgeH = 46 * scaleMultiplier;
      const fontSize = 20 * scaleMultiplier;
      ctx.font = `900 ${fontSize}px sans-serif`;

      const textMetrics = ctx.measureText(packBadgeText);
      const badgeW = textMetrics.width + 65 * scaleMultiplier;

      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12 * scaleMultiplier);
      if (packBadgeColor === 'lime') ctx.fillStyle = '#a3e635';
      else if (packBadgeColor === 'gold') ctx.fillStyle = '#facc15';
      else if (packBadgeColor === 'cyan') ctx.fillStyle = '#38bdf8';
      else ctx.fillStyle = '#f472b6';
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${16 * scaleMultiplier}px sans-serif`;
      ctx.fillText('📦', badgeX + 12 * scaleMultiplier, badgeY + badgeH * 0.68);

      ctx.font = `900 ${fontSize}px 'Tajawal', sans-serif`;
      ctx.fillText(packBadgeText, badgeX + 42 * scaleMultiplier, badgeY + badgeH * 0.70);
      ctx.restore();
    }

    // 5. Draw Top Right Heart Icon
    if (showHeartIcon) {
      ctx.save();
      const hX = W - 70 * scaleMultiplier;
      const hY = 55 * scaleMultiplier;
      const hR = 24 * scaleMultiplier;

      ctx.beginPath();
      ctx.arc(hX, hY, hR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5 * scaleMultiplier;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${18 * scaleMultiplier}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♡', hX, hY);
      ctx.restore();
    }

    // 6. Sort items by zIndex and render with STRICT object-contain preservation
    const sortedItems = [...giftItems].filter(i => i.visible).sort((a, b) => a.zIndex - b.zIndex);

    for (const item of sortedItems) {
      if (!item.dataUrl) continue;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = item.dataUrl;

      await new Promise<void>((resolve) => {
        if (img.complete) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });

      // Bounding box on the target canvas
      const cx = (item.x + item.width / 2) * scaleMultiplier;
      const cy = (item.y + item.height / 2) * scaleMultiplier;
      const bw = item.width * item.scale * scaleMultiplier;
      const bh = item.height * item.scale * scaleMultiplier;

      // Intrinsic aspect ratio contain
      const natW = img.naturalWidth || item.originalWidth || bw;
      const natH = img.naturalHeight || item.originalHeight || bh;
      const nr = natW / natH;
      const br = bw / bh;

      let dw = bw;
      let dh = bh;
      if (nr > br) {
        // Wider: match width
        dh = Math.round(bw / nr);
      } else {
        // Taller: match height
        dw = Math.round(bh * nr);
      }

      ctx.save();
      ctx.translate(cx, cy);
      if (item.rotation) {
        ctx.rotate((item.rotation * Math.PI) / 180);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 24 * scaleMultiplier;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12 * scaleMultiplier;

      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

      // Label tag pill matching VIP 15 reference photo
      if (showItemLabels && item.name) {
        ctx.shadowColor = 'transparent';
        const labelY = dh / 2 + 18 * scaleMultiplier;
        
        ctx.font = `bold ${13 * scaleMultiplier}px 'Tajawal', sans-serif`;
        const textW = ctx.measureText(item.name).width;
        const tagW = Math.max(textW + 28 * scaleMultiplier, 110 * scaleMultiplier);
        const tagH = 26 * scaleMultiplier;

        ctx.fillStyle = 'rgba(10, 16, 32, 0.90)';
        ctx.beginPath();
        ctx.roundRect(-tagW / 2, labelY - 14 * scaleMultiplier, tagW, tagH, 8 * scaleMultiplier);
        ctx.fill();

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 1 * scaleMultiplier;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name, 0, labelY - 1 * scaleMultiplier);
      }

      ctx.restore();
    }

    // 7. Protective Watermark Overlay if enabled
    if (watermarkEnabled && watermarkText) {
      ctx.save();
      ctx.font = `bold ${24 * scaleMultiplier}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.rotate((-25 * Math.PI) / 180);
      const stepX = 350 * scaleMultiplier;
      const stepY = 220 * scaleMultiplier;
      for (let x = -W; x < W * 2; x += stepX) {
        for (let y = -H; y < H * 2; y += stepY) {
          ctx.fillText(watermarkText, x, y);
        }
      }
      ctx.restore();
    }

    // Determine output MIME type
    const mimeType = format === 'webp' ? 'image/webp' : format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'png' ? 1.0 : 0.96;

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, mimeType, quality);
    });
  };

  // Export Download Trigger
  const handleDownload = async (format: 'webp' | 'png' | 'jpeg') => {
    setIsExporting(true);
    try {
      const blob = await renderCanvasToBlob(format, exportMultiplier);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'jpeg' ? 'jpg' : format;
      const filename = `VIP_GIFT_PACK_Showcase_${giftItems.length}_${Date.now()}.${ext}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("حدث خطأ أثناء تصدير الصورة، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to Clipboard Handler
  const handleCopyToClipboard = async () => {
    setIsExporting(true);
    try {
      const blob = await renderCanvasToBlob('png', 2);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      alert("تعذر النسخ إلى الحافظة مباشرةً، يمكنك استخدام أزرار التنزيل.");
    } finally {
      setIsExporting(false);
    }
  };

  // Upload Additional Assets directly from the modal
  const handleAddMoreFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems: ShowcaseGiftItem[] = [];

    for (let idx = 0; idx < files.length; idx++) {
      const f = files[idx];
      const extracted = await fastExtractItemSnapshot({ file: f, name: f.name });
      newItems.push({
        id: `extra_${Date.now()}_${idx}`,
        name: f.name.replace(/\.[^/.]+$/, ''),
        dataUrl: extracted.dataUrl,
        originalWidth: extracted.width || 500,
        originalHeight: extracted.height || 500,
        x: CANVAS_WIDTH * 0.1 + idx * 80,
        y: CANVAS_HEIGHT * 0.3 + idx * 40,
        width: 320,
        height: 320,
        scale: 1.0,
        rotation: 0,
        zIndex: giftItems.length + idx + 1,
        visible: true,
        category: 'normal'
      });
    }

    setGiftItems(prev => applyPresetLayout(activePreset, [...prev, ...newItems]));
    e.target.value = '';
  };

  if (!isOpen) return null;

  const selectedItem = giftItems.find(i => i.id === selectedItemId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3500] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-7xl h-[94vh] bg-[#090d16] border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-right font-arabic"
        >
          {/* Hidden File Input for Direct Upload */}
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept=".svga,.png,.webp,.jpg,.jpeg,.gif,.svg,.mp4"
            className="hidden"
            onChange={handleAddMoreFiles}
          />

          {/* TOP MODAL HEADER */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#0e1628] to-slate-950 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
            {/* Left Action Buttons: Formats, Upload, Copy, Close */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-6 w-px bg-white/10 mx-0.5" />

              {/* Upload Assets Button (الزر المخصص لرفع الصور والهدايا معاً) */}
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-600/15"
                title="رفع ملفات هدايا وصور إضافية وتجميعها في نفس اللوحة (SVGA, PNG, WebP, GIF, MP4)"
              >
                <Upload className="w-4 h-4 text-indigo-300" />
                <span>رفع صور وهدايا للوحة</span>
              </button>

              {/* Copy to Clipboard */}
              <button
                onClick={handleCopyToClipboard}
                disabled={isExporting || giftItems.length === 0}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="نسخ الصورة المجمعة مباشرةً إلى الحافظة"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>

              {/* Resolution Multiplier Toggle */}
              <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs">
                <button
                  onClick={() => setExportMultiplier(1)}
                  className={`px-2 py-1 rounded-lg font-bold ${exportMultiplier === 1 ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                  title="دقة عادية 1080p (حجم خفيف جداً)"
                >
                  1080p
                </button>
                <button
                  onClick={() => setExportMultiplier(2)}
                  className={`px-2 py-1 rounded-lg font-bold ${exportMultiplier === 2 ? 'bg-amber-400/20 text-amber-300' : 'text-slate-400'}`}
                  title="دقة فائقة 4K Ultra HD"
                >
                  4K
                </button>
              </div>

              {/* EXPORT WEBP BUTTON (سريع وخفيف) */}
              <button
                onClick={() => handleDownload('webp')}
                disabled={isExporting || giftItems.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 border border-emerald-200"
                title="تصدير بصيغة WebP خفيفة جداً وسريعة وبأعلى دقة نقاء"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>تصدير WebP</span>
              </button>

              {/* EXPORT PNG BUTTON */}
              <button
                onClick={() => handleDownload('png')}
                disabled={isExporting || giftItems.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 border border-yellow-200"
                title="تصدير وتحميل اللوحة كصورة PNG فائقة الجودة بدقة 4K"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>تصدير PNG</span>
              </button>

              {/* EXPORT JPG BUTTON */}
              <button
                onClick={() => handleDownload('jpeg')}
                disabled={isExporting || giftItems.length === 0}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title="تصدير كصورة JPG عالية الوضوح"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JPG</span>
              </button>
            </div>

            {/* Center/Right: Modal Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black">
                    لوحة حزمة الهدايا • VIP Showcase
                  </span>
                  <h3 className="text-base font-black text-white">استوديو تجميع الهدايا في صورة واحدة</h3>
                </div>
                <p className="text-xs text-slate-400">
                  تطابق 100% مع شكل التصدير وبدون أي تقليص أو تشويه للأبعاد الأصلية
                </p>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
            </div>
          </div>

          {/* MAIN MODAL BODY: Workspace (Left/Center) + Smart Control Sidebar (Right) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* WORKSPACE CANVAS AREA */}
            <div 
              className="flex-1 bg-black/60 relative flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden select-none"
              onMouseMove={handleWorkspaceMouseMove}
              onMouseUp={handleWorkspaceMouseUp}
            >
              {/* Floating Canvas Top Toolbar (Zoom, Reset, Fast Progress) */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-xl">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.1))}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
                  title="تكبير مساحة العمل"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 font-bold min-w-[36px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
                  title="تصغير مساحة العمل"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="text-[10px] text-amber-400 hover:underline px-1"
                  title="إعادة ضبط المقياس"
                >
                  100%
                </button>

                <div className="h-4 w-px bg-white/10 mx-1" />

                {/* Reset Positions Button */}
                <button
                  onClick={() => setGiftItems(prev => applyPresetLayout(activePreset, prev))}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                  title="إعادة ترتيب العناصر تلقائياً بحسب القالب المختار"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>إعادة الترتيب التلقائي</span>
                </button>

                {/* Upload More inside Toolbar */}
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة ملفات</span>
                </button>

                {/* Non-blocking progress indicator badge */}
                {loadingProgress < 100 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black animate-pulse">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>تحميل سريع ({loadingProgress}%)</span>
                  </div>
                )}
              </div>

              {/* Interactive Canvas Stage */}
              {giftItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center p-8 bg-slate-900/60 border border-dashed border-white/10 rounded-3xl max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">لم يتم تحميل ملفات بعد</p>
                  <p className="text-xs text-slate-400">
                    ارفع ملفات SVGA أو صور في نظام العرض أو اضغط على الزر أدناه لإضافتها فوراً
                  </p>
                  <button 
                    onClick={() => uploadInputRef.current?.click()}
                    className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>رفع ملفات هدايا وصور للوحة</span>
                  </button>
                </div>
              ) : (
                <div 
                  ref={workspaceRef}
                  className={`relative rounded-3xl shadow-2xl transition-all overflow-hidden border ${BG_THEMES.find(t => t.id === bgTheme)?.border || 'border-white/10'}`}
                  style={{
                    width: '100%',
                    maxWidth: `${1000 * zoomLevel}px`,
                    aspectRatio: '16 / 9',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                  onClick={() => setSelectedItemId(null)}
                >
                  {/* Background Theme */}
                  <div className={`absolute inset-0 ${BG_THEMES.find(t => t.id === bgTheme)?.class || 'bg-[#060b17]'}`}>
                    {bgTheme === 'vip_midnight' && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_38%_45%,rgba(59,130,246,0.16),transparent_70%)] pointer-events-none" />
                    )}
                  </div>

                  {/* Gold Luxury Double Borders matching VIP 15 reference */}
                  {showGoldBorders && bgTheme !== 'transparent' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-2 sm:inset-3 border-2 border-amber-400/80 rounded-2xl" />
                      <div className="absolute inset-3 sm:inset-4 border border-amber-500/40 rounded-xl" />
                    </div>
                  )}

                  {/* Top-Right VIP Title Header matching VIP 15 reference */}
                  {showVipTitle && vipMainTitle && bgTheme !== 'transparent' && (
                    <div className="absolute top-4 right-6 z-30 text-right pointer-events-none">
                      <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-md tracking-wider">
                        {vipMainTitle}
                      </h2>
                      {vipSubTitle && (
                        <p className="text-[9px] sm:text-[11px] font-bold text-amber-200/90 drop-shadow">
                          {vipSubTitle}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Top-Left Pill Badge: "📦 PACK · 42" */}
                  {showPackBadge && packBadgeText && (
                    <div 
                      className={`absolute top-4 left-5 z-30 flex items-center gap-2 px-3 py-1 rounded-xl font-black text-xs shadow-xl pointer-events-none ${
                        packBadgeColor === 'lime' 
                          ? 'bg-[#a3e635] text-slate-950 ring-2 ring-lime-400/40' 
                          : packBadgeColor === 'gold'
                          ? 'bg-[#facc15] text-slate-950 ring-2 ring-yellow-400/40'
                          : packBadgeColor === 'cyan'
                          ? 'bg-[#38bdf8] text-slate-950 ring-2 ring-sky-400/40'
                          : 'bg-[#f472b6] text-slate-950 ring-2 ring-pink-400/40'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="tracking-wide text-xs">{packBadgeText}</span>
                    </div>
                  )}

                  {/* Top-Right Heart Icon */}
                  {showHeartIcon && (
                    <div className="absolute top-4 right-5 z-30 w-8 h-8 rounded-full bg-slate-900/60 border border-white/15 flex items-center justify-center text-white/90 shadow-lg pointer-events-none backdrop-blur-sm">
                      <Heart className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  {/* Placed Gift Items on Canvas (With STRICT contain ratio & zero distortion) */}
                  {giftItems.map((item) => {
                    if (!item.visible) return null;

                    const leftPct = (item.x / CANVAS_WIDTH) * 100;
                    const topPct = (item.y / CANVAS_HEIGHT) * 100;
                    const widthPct = (item.width / CANVAS_WIDTH) * 100 * item.scale;
                    const heightPct = (item.height / CANVAS_HEIGHT) * 100 * item.scale;
                    const isSelected = item.id === selectedItemId;

                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                        className={`absolute cursor-move group transition-shadow ${
                          isSelected 
                            ? 'ring-2 ring-amber-400 shadow-2xl shadow-amber-500/30' 
                            : 'hover:ring-1 hover:ring-white/40'
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                          zIndex: item.zIndex,
                          transform: `rotate(${item.rotation}deg)`,
                          transformOrigin: 'center center'
                        }}
                      >
                        {/* The Gift Graphic: object-contain guarantees NO DISTORTION whatsoever */}
                        <div className="w-full h-full relative flex items-center justify-center p-0.5">
                          {item.dataUrl ? (
                            <img
                              src={item.dataUrl}
                              alt={item.name}
                              className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] pointer-events-none select-none"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-pulse text-center">
                              <Sparkles className="w-6 h-6 text-amber-400 mb-1" />
                              <span className="text-[9px] text-amber-200 font-bold truncate max-w-full">
                                {item.name}
                              </span>
                            </div>
                          )}

                          {/* Item Label Tag matching VIP 15 reference */}
                          {showItemLabels && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-lg bg-slate-950/90 border border-amber-400/30 text-[9px] font-bold text-slate-100 backdrop-blur-sm whitespace-nowrap shadow-md pointer-events-none">
                              {item.name}
                            </div>
                          )}

                          {/* Selection bounding box handles */}
                          {isSelected && (
                            <>
                              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-slate-950 rounded-full" />
                              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-slate-950 rounded-full" />
                              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-slate-950 rounded-full" />
                              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-slate-950 rounded-full" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Watermark Overlay in Workspace */}
                  {watermarkEnabled && watermarkText && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-wrap gap-20 p-10 opacity-20 -rotate-12">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <span key={i} className="text-xl font-black text-white whitespace-nowrap">
                          {watermarkText}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SMART CONTROL SIDEBAR (RIGHT) */}
            <div className="w-full lg:w-80 bg-slate-950/95 border-t lg:border-t-0 lg:border-r border-white/10 flex flex-col overflow-y-auto p-4 gap-4 text-slate-200 shrink-0">
              
              {/* SECTION 1: LAYOUT PRESETS (القوالب الذكية) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {giftItems.length} عنصر
                  </span>
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-amber-400" />
                    <span>أنماط التوزيع والترتيب الذكي</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleSelectPreset('vip_showcase')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'vip_showcase'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-1 rounded bg-amber-400/20 text-amber-300 font-bold">VIP</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold">حزمة VIP الفاخرة</span>
                    <span className="text-[10px] text-slate-400">مثل صورة الذئب والعرش</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('gold_catalog')}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'gold_catalog'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-1 rounded bg-yellow-400/20 text-yellow-300 font-bold">VIP 15</span>
                      <Grid className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    <span className="text-xs font-bold">كتالوج ذهبي (2×3)</span>
                    <span className="text-[10px] text-slate-400">مثل صورة VIP 15</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('podium_hierarchy')}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'podium_hierarchy'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">منصة التتويج الملكية</span>
                    <span className="text-[10px] text-slate-400">بطل في الوسط وجوانب</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('horizontal_banner')}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'horizontal_banner'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">شريط بانورامي</span>
                    <span className="text-[10px] text-slate-400">صف أفقي متناسق</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('vertical_story')}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'vertical_story'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">قصة عمودية للهاتف</span>
                    <span className="text-[10px] text-slate-400">توزيع رأسي جذاب</span>
                  </button>

                  <button
                    onClick={() => handleSelectPreset('auto_flow')}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      activePreset === 'auto_flow'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-black'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">توزيع تلقائي ذكي</span>
                    <span className="text-[10px] text-slate-400">شبكة تلقائية مرنة</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: LUXURY OVERLAYS & HEADERS (إطارات وعناوين VIP) */}
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <label className="text-xs font-black text-amber-300 flex items-center justify-between">
                  <input
                    type="checkbox"
                    checked={showGoldBorders}
                    onChange={(e) => setShowGoldBorders(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>إطار ذهبي ملكي مزدوج (مثل VIP 15)</span>
                </label>

                <label className="text-xs font-black text-amber-300 flex items-center justify-between mt-1">
                  <input
                    type="checkbox"
                    checked={showVipTitle}
                    onChange={(e) => setShowVipTitle(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>عنوان الحزمة الذهبي الرئيسي</span>
                </label>

                {showVipTitle && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <input
                      type="text"
                      value={vipMainTitle}
                      onChange={(e) => setVipMainTitle(e.target.value)}
                      placeholder="عنوان الحزمة الرئيسي"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-amber-400/30 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      value={vipSubTitle}
                      onChange={(e) => setVipSubTitle(e.target.value)}
                      placeholder="العنوان الفرعي"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[10px] text-slate-300 focus:outline-none focus:border-white/30"
                    />
                  </div>
                )}

                <label className="text-xs font-black text-slate-300 flex items-center justify-between mt-1">
                  <input
                    type="checkbox"
                    checked={showItemLabels}
                    onChange={(e) => setShowItemLabels(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>بطاقات أسماء العناصر أسفل كل هدية</span>
                </label>
              </div>

              {/* SECTION 3: BACKGROUND THEMES (الخلفيات) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>طابع ولون الخلفية</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {BG_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setBgTheme(theme.id)}
                      className={`p-2 rounded-xl border text-right transition-all flex items-center gap-2 ${
                        bgTheme === theme.id
                          ? 'bg-amber-400/20 border-amber-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${theme.class} border border-white/20`} />
                      <span className="text-[11px] truncate">{theme.name.split(' (')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 4: SELECTED ITEM EDIT CONTROLS (التحكم في العنصر المحدد) */}
              {selectedItem ? (
                <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleDeleteItem(selectedItem.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="حذف هذا العنصر من اللوحة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-amber-300 truncate max-w-[180px]">
                      {selectedItem.name}
                    </span>
                  </div>

                  {/* Scale Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>{Math.round(selectedItem.scale * 100)}%</span>
                      <span>الحجم (Scale)</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="2.5"
                      step="0.05"
                      value={selectedItem.scale}
                      onChange={(e) => updateSelectedItem({ scale: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Rotation Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>{selectedItem.rotation}°</span>
                      <span>التدوير (Rotation)</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={selectedItem.rotation}
                      onChange={(e) => updateSelectedItem({ rotation: parseInt(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Layer ordering buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => bringToFront(selectedItem.id)}
                      className="flex-1 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3 text-amber-400" />
                      <span>للمقدمة</span>
                    </button>
                    <button
                      onClick={() => sendToBack(selectedItem.id)}
                      className="flex-1 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <ArrowDown className="w-3 h-3 text-amber-400" />
                      <span>للخلف</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-400">
                  انقر على أي هدية داخل اللوحة لتحريكها أو تكبيرها أو تدويرها بحرية
                </div>
              )}

              {/* SECTION 5: WATERMARK & PROTECTION (العلامة المائية) */}
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                  <input
                    type="checkbox"
                    checked={watermarkEnabled}
                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>تفعيل علامة مائية شفافة للحماية</span>
                </label>

                {watermarkEnabled && (
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="نص العلامة المائية"
                    className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
