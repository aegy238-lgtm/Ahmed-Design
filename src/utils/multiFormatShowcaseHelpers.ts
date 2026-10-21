export type ShowcaseFormatType =
  | 'svga'
  | 'yyeva'
  | 'vap'
  | 'webm'
  | 'gif'
  | 'png_seq'
  | 'mp4'
  | 'pag'
  | 'webp'
  | 'image';

export type AlphaLayoutOverrideMode =
  | 'auto'
  | 'vap_half_right'
  | 'vap_half_left'
  | 'yyeva_50'
  | 'vap_50'
  | 'top_bottom'
  | 'full';

export interface FormatBadgeMeta {
  format: ShowcaseFormatType;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  isAlphaCapable: boolean;
  isDualChannel: boolean;
}

export interface NormalizedVapBoxInfo {
  w: number;
  h: number;
  videoW: number;
  videoH: number;
  fps: number;
  f: number;
  rgbFrame: [number, number, number, number];
  aFrame: [number, number, number, number];
  isHalfScaleAlpha: boolean;
  alphaPlacement: 'right' | 'left' | 'top' | 'bottom';
}

export function classifyFileExtension(fileName: string): ShowcaseFormatType {
  const lower = (fileName || '').toLowerCase().trim();
  const ext = lower.split('.').pop() || '';

  if (ext === 'svga') return 'svga';
  if (ext === 'pag') return 'pag';
  if (ext === 'gif') return 'gif';
  if (ext === 'webm') return 'webm';
  if (ext === 'zip') return 'png_seq';
  if (ext === 'vap') return 'vap';
  if (ext === 'webp') return 'webp';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'avif') return 'image';

  if (lower.includes('yyeva') || lower.includes('right_alpha') || lower.includes('alpha_right')) {
    return 'yyeva';
  }
  if (lower.includes('vap') || lower.includes('left_alpha') || lower.includes('alpha_left')) {
    return 'vap';
  }

  if (ext === 'mp4' || ext === 'mov' || ext === 'm4v') {
    return 'mp4';
  }

  return 'mp4';
}

export function getFormatBadgeMeta(
  format: ShowcaseFormatType,
  isHalfScaleAlpha?: boolean
): FormatBadgeMeta {
  switch (format) {
    case 'svga':
      return {
        format: 'svga',
        label: 'SVGA حركة أصلية',
        shortLabel: 'SVGA',
        description: 'ملف حركة فيكتور وطبقات شفافة مع صوت مدمج',
        colorClass: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'yyeva':
      return {
        format: 'yyeva',
        label: isHalfScaleAlpha ? 'YYEVA / VAP (ألفا ذكي مدمج)' : 'YYEVA (ألفا يمين)',
        shortLabel: 'YYEVA',
        description: isHalfScaleAlpha
          ? 'فيديو شفاف مزدوج القناة مع قناع ألفا مدمج عالي الدقة'
          : 'فيديو مزدوج القناة: الألوان يسار والشفافية يمين',
        colorClass: 'bg-pink-500/25 text-pink-200 border-pink-400/50',
        isAlphaCapable: true,
        isDualChannel: true,
      };
    case 'vap':
      return {
        format: 'vap',
        label: isHalfScaleAlpha ? 'Tencent VAP (ألفا ذكي مدمج)' : 'Tencent VAP (ألفا يسار)',
        shortLabel: 'VAP',
        description: isHalfScaleAlpha
          ? 'فيديو Tencent VAP شفاف مع إحداثيات vapc الدقيقة'
          : 'فيديو مزدوج القناة: الشفافية يسار والألوان يمين',
        colorClass: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50',
        isAlphaCapable: true,
        isDualChannel: true,
      };
    case 'webm':
      return {
        format: 'webm',
        label: 'WebM شفاف',
        shortLabel: 'WebM',
        description: 'فيديو WebM VP9 بقناة ألفا شفافة مباشرة',
        colorClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'gif':
      return {
        format: 'gif',
        label: 'GIF متحرك',
        shortLabel: 'GIF',
        description: 'صورة متحركة GIF شفافة متوافقة مع كافة المنصات',
        colorClass: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'png_seq':
      return {
        format: 'png_seq',
        label: 'سلسلة PNG (ZIP)',
        shortLabel: 'PNG ZIP',
        description: 'حزمة إطارات PNG شفافة عالية الدقة',
        colorClass: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'pag':
      return {
        format: 'pag',
        label: 'Tencent PAG',
        shortLabel: 'PAG',
        description: 'ملف تاثيرات Tencent PAG التفاعلي',
        colorClass: 'bg-orange-500/25 text-orange-200 border-orange-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'webp':
      return {
        format: 'webp',
        label: 'WebP متحرك',
        shortLabel: 'WebP',
        description: 'صورة WebP متحركة شفافة عالية الجودة',
        colorClass: 'bg-teal-500/25 text-teal-200 border-teal-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'image':
      return {
        format: 'image',
        label: 'صورة / تصميم',
        shortLabel: 'IMG',
        description: 'ملف صورة ثابتة أو إطار شفاف',
        colorClass: 'bg-sky-500/25 text-sky-200 border-sky-400/50',
        isAlphaCapable: true,
        isDualChannel: false,
      };
    case 'mp4':
    default:
      return {
        format: 'mp4',
        label: 'MP4 قياسي',
        shortLabel: 'MP4',
        description: 'ملف فيديو MP4 قياسي عالي الوضوح',
        colorClass: 'bg-blue-500/25 text-blue-200 border-blue-400/50',
        isAlphaCapable: false,
        isDualChannel: false,
      };
  }
}

export function getGridColumnClasses(cols: 1 | 2 | 3 | 4): string {
  switch (cols) {
    case 1:
      return 'grid-cols-1 max-w-2xl mx-auto';
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 4:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    case 3:
    default:
      return 'grid-cols-1 md:grid-cols-3';
  }
}

/**
 * Extracts a balanced JSON object starting at `startBraceIdx` ('{')
 * Safely ignores '{' and '}' inside string literals and stops at the exact matching '}'
 * so trailing MP4 binary bytes containing 0x7D ('}') never corrupt JSON.parse.
 */
export function extractBalancedJsonSubstring(text: string, startBraceIdx: number): string | null {
  if (startBraceIdx < 0 || startBraceIdx >= text.length || text[startBraceIdx] !== '{') {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;
  const maxScan = Math.min(text.length, startBraceIdx + 32768);

  for (let i = startBraceIdx; i < maxScan; i++) {
    const ch = text[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      isEscaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.substring(startBraceIdx, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Parses and normalizes a raw text chunk from an MP4 vapc / yyea / udta box into NormalizedVapBoxInfo.
 */
export function parseVapJsonFromText(rawText: string): NormalizedVapBoxInfo | null {
  if (!rawText) return null;
  const clean = rawText.replace(/\0/g, '');

  const candidateStarts: number[] = [];

  // 1. Look for anchor keys like "rgbFrame" or "alphaFrame" or "aFrame"
  const anchorKeys = ['"rgbFrame"', '"aFrame"', '"alphaFrame"'];
  for (const key of anchorKeys) {
    let idx = clean.indexOf(key);
    while (idx !== -1) {
      const innerBrace = clean.lastIndexOf('{', idx);
      if (innerBrace !== -1) {
        const outerBrace = clean.lastIndexOf('{', innerBrace - 1);
        if (outerBrace !== -1 && idx - outerBrace < 4096) {
          candidateStarts.push(outerBrace);
        }
        candidateStarts.push(innerBrace);
      }
      idx = clean.indexOf(key, idx + key.length);
    }
  }

  // 2. Also try the first '{' in the string
  const firstBrace = clean.indexOf('{');
  if (firstBrace !== -1 && !candidateStarts.includes(firstBrace)) {
    candidateStarts.push(firstBrace);
  }

  for (const startIdx of candidateStarts) {
    const jsonSub = extractBalancedJsonSubstring(clean, startIdx);
    if (!jsonSub) continue;

    try {
      const parsed = JSON.parse(jsonSub);
      const desc = parsed.descript || parsed.info || parsed;
      if (!desc || typeof desc !== 'object') continue;

      const rawRgb = desc.rgbFrame;
      const rawAlpha = desc.alphaFrame || desc.aFrame;

      if (
        !Array.isArray(rawRgb) ||
        rawRgb.length < 4 ||
        !Array.isArray(rawAlpha) ||
        rawAlpha.length < 4
      ) {
        continue;
      }

      const rgbFrame: [number, number, number, number] = [
        Number(rawRgb[0]) || 0,
        Number(rawRgb[1]) || 0,
        Math.max(2, Number(rawRgb[2]) || 750),
        Math.max(2, Number(rawRgb[3]) || 1334),
      ];
      const aFrame: [number, number, number, number] = [
        Number(rawAlpha[0]) || 0,
        Number(rawAlpha[1]) || 0,
        Math.max(2, Number(rawAlpha[2]) || rgbFrame[2]),
        Math.max(2, Number(rawAlpha[3]) || rgbFrame[3]),
      ];

      const w = Number(desc.width || desc.w || rgbFrame[2]) || rgbFrame[2];
      const h = Number(desc.height || desc.h || rgbFrame[3]) || rgbFrame[3];

      const minVideoW = Math.max(rgbFrame[0] + rgbFrame[2], aFrame[0] + aFrame[2]);
      const minVideoH = Math.max(rgbFrame[1] + rgbFrame[3], aFrame[1] + aFrame[3]);

      const videoW = Math.max(minVideoW, Number(desc.videoWidth || desc.videoW) || minVideoW);
      const videoH = Math.max(minVideoH, Number(desc.videoHeight || desc.videoH) || minVideoH);

      const fps =
        desc.fps && desc.fps > 0 && desc.fps <= 120
          ? Number(desc.fps)
          : desc.rate && desc.rate > 0 && desc.rate <= 120
          ? Number(desc.rate)
          : 24;

      const f =
        desc.f && desc.f > 0 && desc.f !== fps
          ? Number(desc.f)
          : Number(desc.totalFrame || desc.totalFrames || desc.frames || Math.round(fps * 3));

      const isHalfScaleAlpha =
        aFrame[2] <= rgbFrame[2] * 0.75 || aFrame[3] <= rgbFrame[3] * 0.75;

      let alphaPlacement: 'right' | 'left' | 'top' | 'bottom' = 'right';
      if (aFrame[0] > rgbFrame[0]) alphaPlacement = 'right';
      else if (rgbFrame[0] > aFrame[0]) alphaPlacement = 'left';
      else if (aFrame[1] > rgbFrame[1]) alphaPlacement = 'bottom';
      else if (rgbFrame[1] > aFrame[1]) alphaPlacement = 'top';

      return {
        w,
        h,
        videoW,
        videoH,
        fps,
        f,
        rgbFrame,
        aFrame,
        isHalfScaleAlpha,
        alphaPlacement,
      };
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

/**
 * Extracts and normalizes VAP / YYEVA metadata directly from an MP4 ArrayBuffer.
 */
export function extractVapInfoFromMp4Buffer(buffer: ArrayBuffer): NormalizedVapBoxInfo | null {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    return parseVapJsonFromText(text);
  } catch {
    return null;
  }
}

/**
 * Computes exact RGB and Alpha channel rectangles for WebGL / 2D rendering.
 * Supports:
 * 1. Exact `vapc` / `yyea` metadata coordinates (`vapInfo`) with automatic resolution scaling
 * 2. Half-scale top-right / top-left alpha layouts (e.g. 1136x1632 where RGB is 752x1632 and Alpha is 376x816)
 * 3. Standard 50/50 horizontal YYEVA (RGB left, Alpha right) and VAP (Alpha left, RGB right)
 * 4. Vertical top/bottom split and full normal MP4 frames
 */
export function computeDualChannelRects(
  rawWidth: number,
  rawHeight: number,
  mode: 'yyeva' | 'vap' | 'full' | AlphaLayoutOverrideMode,
  vapInfo?: Partial<NormalizedVapBoxInfo> | null,
  detectedRects?: {
    rgbFrame: [number, number, number, number];
    aFrame: [number, number, number, number];
    outputWidth?: number;
    outputHeight?: number;
    isVap?: boolean;
  } | null
): {
  rgbFrame: [number, number, number, number];
  aFrame: [number, number, number, number];
  renderWidth: number;
  renderHeight: number;
  isHalfScaleAlpha: boolean;
} {
  const safeW = Math.max(2, rawWidth);
  const safeH = Math.max(2, rawHeight);

  // 1. Explicit full normal video mode
  if (mode === 'full') {
    return {
      rgbFrame: [0, 0, safeW, safeH],
      aFrame: [0, 0, safeW, safeH],
      renderWidth: safeW,
      renderHeight: safeH,
      isHalfScaleAlpha: false,
    };
  }

  // 2. Explicit manual override modes
  if (mode === 'vap_half_right') {
    // 2/3 RGB Left + 1/3 Top-Right Half-Scale Alpha (e.g. 1136x1632 -> RGB 752x1632, Alpha 376x816)
    const rgbW = Math.floor(((safeW * 2) / 3) / 8) * 8 || Math.round((safeW * 2) / 3);
    const alphaW = Math.min(safeW - rgbW, Math.round(rgbW / 2));
    const alphaH = Math.round(safeH / 2);
    return {
      rgbFrame: [0, 0, rgbW, safeH],
      aFrame: [ safeW - alphaW, 0, alphaW, alphaH ],
      renderWidth: rgbW,
      renderHeight: safeH,
      isHalfScaleAlpha: true,
    };
  }

  if (mode === 'vap_half_left') {
    const rgbW = Math.floor(((safeW * 2) / 3) / 8) * 8 || Math.round((safeW * 2) / 3);
    const alphaW = Math.min(safeW - rgbW, Math.round(rgbW / 2));
    const alphaH = Math.round(safeH / 2);
    return {
      rgbFrame: [safeW - rgbW, 0, rgbW, safeH],
      aFrame: [0, 0, alphaW, alphaH],
      renderWidth: rgbW,
      renderHeight: safeH,
      isHalfScaleAlpha: true,
    };
  }

  if (mode === 'yyeva_50') {
    const halfW = Math.round(safeW / 2);
    return {
      rgbFrame: [0, 0, halfW, safeH],
      aFrame: [halfW, 0, halfW, safeH],
      renderWidth: halfW,
      renderHeight: safeH,
      isHalfScaleAlpha: false,
    };
  }

  if (mode === 'vap_50') {
    const halfW = Math.round(safeW / 2);
    return {
      rgbFrame: [halfW, 0, halfW, safeH],
      aFrame: [0, 0, halfW, safeH],
      renderWidth: halfW,
      renderHeight: safeH,
      isHalfScaleAlpha: false,
    };
  }

  if (mode === 'top_bottom') {
    const halfH = Math.round(safeH / 2);
    return {
      rgbFrame: [0, 0, safeW, halfH],
      aFrame: [0, halfH, safeW, halfH],
      renderWidth: safeW,
      renderHeight: halfH,
      isHalfScaleAlpha: false,
    };
  }

  // 3. Automatic / Smart mode ('auto', 'yyeva', 'vap'):
  // Priority A: Trust embedded vapc / yyea metadata coordinates if present
  if (
    vapInfo?.rgbFrame &&
    vapInfo.rgbFrame.length >= 4 &&
    vapInfo?.aFrame &&
    vapInfo.aFrame.length >= 4
  ) {
    const refW = vapInfo.videoW && vapInfo.videoW > 0 ? vapInfo.videoW : safeW;
    const refH = vapInfo.videoH && vapInfo.videoH > 0 ? vapInfo.videoH : safeH;
    const scaleX = safeW / refW;
    const scaleY = safeH / refH;

    const rf: [number, number, number, number] = [
      Math.round(vapInfo.rgbFrame[0] * scaleX),
      Math.round(vapInfo.rgbFrame[1] * scaleY),
      Math.max(2, Math.round(vapInfo.rgbFrame[2] * scaleX)),
      Math.max(2, Math.round(vapInfo.rgbFrame[3] * scaleY)),
    ];
    const af: [number, number, number, number] = [
      Math.round(vapInfo.aFrame[0] * scaleX),
      Math.round(vapInfo.aFrame[1] * scaleY),
      Math.max(2, Math.round(vapInfo.aFrame[2] * scaleX)),
      Math.max(2, Math.round(vapInfo.aFrame[3] * scaleY)),
    ];

    const outW = vapInfo.w ? Math.round(vapInfo.w * scaleX) : rf[2];
    const outH = vapInfo.h ? Math.round(vapInfo.h * scaleY) : rf[3];
    const isHalf = af[2] <= rf[2] * 0.75 || af[3] <= rf[3] * 0.75;

    return {
      rgbFrame: rf,
      aFrame: af,
      renderWidth: Math.max(2, outW),
      renderHeight: Math.max(2, outH),
      isHalfScaleAlpha: isHalf,
    };
  }

  // Priority B: Trust optical frame detection if available
  if (
    detectedRects?.rgbFrame &&
    detectedRects.rgbFrame.length >= 4 &&
    detectedRects?.aFrame &&
    detectedRects.aFrame.length >= 4
  ) {
    if (detectedRects.isVap === false) {
      return {
        rgbFrame: [0, 0, safeW, safeH],
        aFrame: [0, 0, safeW, safeH],
        renderWidth: safeW,
        renderHeight: safeH,
        isHalfScaleAlpha: false,
      };
    }

    const rf = detectedRects.rgbFrame;
    const af = detectedRects.aFrame;
    const isHalf = af[2] <= rf[2] * 0.75 || af[3] <= rf[3] * 0.75;
    return {
      rgbFrame: rf,
      aFrame: af,
      renderWidth: detectedRects.outputWidth || rf[2],
      renderHeight: detectedRects.outputHeight || rf[3],
      isHalfScaleAlpha: isHalf,
    };
  }

  // Priority C: Smart Aspect Ratio Heuristic for Portrait Half-Scale Alpha (1.5x width, e.g. 1136x1632)
  const aspect = safeW / safeH;
  if (aspect >= 0.64 && aspect <= 0.86 && safeH >= 700) {
    const rgbW = Math.floor(((safeW * 2) / 3) / 8) * 8 || Math.round((safeW * 2) / 3);
    const alphaW = Math.min(safeW - rgbW, Math.round(rgbW / 2));
    const alphaH = Math.round(safeH / 2);

    if (mode === 'vap') {
      return {
        rgbFrame: [safeW - rgbW, 0, rgbW, safeH],
        aFrame: [0, 0, alphaW, alphaH],
        renderWidth: rgbW,
        renderHeight: safeH,
        isHalfScaleAlpha: true,
      };
    }

    return {
      rgbFrame: [0, 0, rgbW, safeH],
      aFrame: [safeW - alphaW, 0, alphaW, alphaH],
      renderWidth: rgbW,
      renderHeight: safeH,
      isHalfScaleAlpha: true,
    };
  }

  // Priority D: Standard 50/50 split
  const halfW = Math.round(safeW / 2);
  if (mode === 'vap') {
    return {
      rgbFrame: [halfW, 0, halfW, safeH],
      aFrame: [0, 0, halfW, safeH],
      renderWidth: halfW,
      renderHeight: safeH,
      isHalfScaleAlpha: false,
    };
  }

  return {
    rgbFrame: [0, 0, halfW, safeH],
    aFrame: [halfW, 0, halfW, safeH],
    renderWidth: halfW,
    renderHeight: safeH,
    isHalfScaleAlpha: false,
  };
}

/**
 * Computes strictly monotonic, deterministic microsecond timestamp and duration
 * for WebCodecs VideoFrame to guarantee smooth, zero-stutter MP4/WebM playback.
 */
export function computeDeterministicFrameTiming(
  frameIndex: number,
  fps: number
): { timestampUs: number; durationUs: number; isKeyFrame: boolean } {
  const safeFps = Math.max(1, Math.min(120, Number.isFinite(fps) ? fps : 30));
  const safeIndex = Math.max(0, Math.floor(frameIndex));
  const timestampUs = Math.round((safeIndex * 1_000_000) / safeFps);
  const nextTimestampUs = Math.round(((safeIndex + 1) * 1_000_000) / safeFps);
  const durationUs = Math.max(1000, nextTimestampUs - timestampUs);
  const keyFrameInterval = Math.max(15, Math.round(safeFps));
  const isKeyFrame = safeIndex === 0 || safeIndex % keyFrameInterval === 0;
  return { timestampUs, durationUs, isKeyFrame };
}

/**
 * Computes a safe mid-frame seek timestamp in seconds for HTMLVideoElement
 * so float truncation never lands just before a frame PTS boundary (which duplicates the previous frame).
 */
export function computeSafeSeekTime(
  frameIndex: number,
  fps: number,
  durationSeconds?: number
): number {
  const safeFps = Math.max(1, Math.min(120, Number.isFinite(fps) ? fps : 30));
  const safeIndex = Math.max(0, Math.floor(frameIndex));
  // Land 25% inside the frame's presentation window to avoid boundary rounding jitter
  const targetTime = (safeIndex + 0.25) / safeFps;
  if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.min(Math.max(0, durationSeconds - 0.002), targetTime);
  }
  return Math.max(0, targetTime);
}

/**
 * Computes hardware-decoder-friendly dimensions for single or dual-channel (YYEVA/VAP) H.264/WebM export.
 * Caps total encoded dimensions within maxDimension (default 1920) and aligns single & total dimensions
 * to multiples of 4 so neither singleWidth nor exportWidth is ever mismatched or exceeds H.264 Level 4.2 limits.
 */
export function computeHardwareFriendlyDimensions(
  rawWidth: number,
  rawHeight: number,
  isDualChannel: boolean,
  maxDimension: number = 1920
): {
  singleWidth: number;
  singleHeight: number;
  exportWidth: number;
  exportHeight: number;
  scaleFactor: number;
} {
  let w = Math.max(16, Math.round(Number.isFinite(rawWidth) ? rawWidth : 600));
  let h = Math.max(16, Math.round(Number.isFinite(rawHeight) ? rawHeight : 600));
  const safeMax = Math.max(256, maxDimension);

  // For dual-channel (2x width), singleWidth cannot exceed safeMax / 2
  const maxSingleW = isDualChannel ? Math.floor(safeMax / 2) : safeMax;
  const maxSingleH = safeMax;

  let scaleFactor = 1;
  if (w > maxSingleW || h > maxSingleH) {
    scaleFactor = Math.min(maxSingleW / w, maxSingleH / h);
    w = Math.max(16, Math.round(w * scaleFactor));
    h = Math.max(16, Math.round(h * scaleFactor));
  }

  // Align single dimensions to multiples of 4 so both single and 2x widths are multiples of 4/8
  const singleWidth = Math.max(16, Math.floor(w / 4) * 4);
  const singleHeight = Math.max(16, Math.floor(h / 4) * 4);
  const exportWidth = isDualChannel ? singleWidth * 2 : singleWidth;
  const exportHeight = singleHeight;

  return {
    singleWidth,
    singleHeight,
    exportWidth,
    exportHeight,
    scaleFactor,
  };
}

/**
 * Draws an opaque grayscale alpha mask ([A, A, A, 255]) onto targetCtx at (destX, destY, width, height)
 * using 100% GPU-accelerated Canvas 2D compositing (zero CPU getImageData/putImageData readback stalls).
 */
export function drawGpuGrayscaleAlphaMask(
  targetCtx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  scratchCanvas: HTMLCanvasElement,
  scratchCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  width: number,
  height: number,
  srcX: number = 0,
  srcY: number = 0,
  srcW: number = width,
  srcH: number = height
): void {
  if (scratchCanvas.width !== width || scratchCanvas.height !== height) {
    scratchCanvas.width = width;
    scratchCanvas.height = height;
  }

  // Step 1: Copy source RGBA onto scratch canvas (preserving exact alpha A)
  scratchCtx.globalCompositeOperation = 'copy';
  scratchCtx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, width, height);

  // Step 2: Replace RGB with pure white (#ffffff) while keeping alpha = A -> [255, 255, 255, A]
  scratchCtx.globalCompositeOperation = 'source-in';
  scratchCtx.fillStyle = '#ffffff';
  scratchCtx.fillRect(0, 0, width, height);
  scratchCtx.globalCompositeOperation = 'source-over';

  // Step 3: Fill destination region with opaque black (#000000) and composite white-alpha on top
  // Result: R = A, G = A, B = A, Alpha = 255!
  targetCtx.save();
  targetCtx.globalCompositeOperation = 'source-over';
  targetCtx.fillStyle = '#000000';
  targetCtx.fillRect(destX, destY, width, height);
  targetCtx.drawImage(scratchCanvas, 0, 0, width, height, destX, destY, width, height);
  targetCtx.restore();
}

/**
 * Fast MP4 binary container parser that extracts exact frame count (`stsz` sample count)
 * and native FPS from MP4 boxes (`stsz`, `mdhd`, `mvhd`, or embedded `vapc` JSON).
 */
export function parseMp4TrackInfoFromBuffer(buffer: ArrayBuffer): {
  fps: number;
  totalFrames: number;
  durationSeconds: number;
} | null {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const len = bytes.length;

    // 1. Check if vapc box exists first (most authoritative for VAP/YYEVA)
    const vapcInfo = extractVapInfoFromMp4Buffer(buffer);

    // 2. Scan for 'stsz' (Sample Size Box) which stores exact sample_count for tracks
    let maxSampleCount = 0;
    for (let i = 0; i < len - 20; i++) {
      // 'stsz' = 0x73, 0x74, 0x73, 0x7A
      if (
        bytes[i] === 0x73 &&
        bytes[i + 1] === 0x74 &&
        bytes[i + 2] === 0x73 &&
        bytes[i + 3] === 0x7a &&
        i >= 4
      ) {
        const boxSize = view.getUint32(i - 4, false);
        if (boxSize >= 20 && i - 4 + boxSize <= len) {
          const version = bytes[i + 4];
          if (version === 0) {
            const sampleCount = view.getUint32(i + 12, false);
            if (sampleCount > maxSampleCount && sampleCount < 100_000) {
              maxSampleCount = sampleCount;
            }
          }
        }
      }
    }

    // 3. Scan for 'mvhd' (Movie Header Box) to get container duration
    let durationSeconds = 0;
    for (let i = 0; i < len - 32; i++) {
      // 'mvhd' = 0x6D, 0x76, 0x68, 0x64
      if (
        bytes[i] === 0x6d &&
        bytes[i + 1] === 0x76 &&
        bytes[i + 2] === 0x68 &&
        bytes[i + 3] === 0x64 &&
        i >= 4
      ) {
        const version = bytes[i + 4];
        if (version === 0 && i + 24 <= len) {
          const timescale = view.getUint32(i + 16, false);
          const duration = view.getUint32(i + 20, false);
          if (timescale > 0 && duration > 0) {
            const d = duration / timescale;
            if (d > 0.05 && d < 3600) {
              durationSeconds = d;
              break;
            }
          }
        }
      }
    }

    if (vapcInfo && vapcInfo.fps && vapcInfo.f) {
      const fps = Math.max(1, Math.min(120, Math.round(vapcInfo.fps)));
      const totalFrames = Math.max(1, Math.round(vapcInfo.f));
      return {
        fps,
        totalFrames,
        durationSeconds: durationSeconds > 0 ? durationSeconds : totalFrames / fps,
      };
    }

    if (maxSampleCount > 0 && durationSeconds > 0) {
      const rawFps = maxSampleCount / durationSeconds;
      // Snap near standard framerates (24, 25, 30, 50, 60)
      const standardFps = [15, 20, 24, 25, 30, 48, 50, 60];
      let bestFps = Math.round(rawFps);
      for (const candidate of standardFps) {
        if (Math.abs(rawFps - candidate) <= 0.85) {
          bestFps = candidate;
          break;
        }
      }
      bestFps = Math.max(1, Math.min(120, bestFps));
      return {
        fps: bestFps,
        totalFrames: maxSampleCount,
        durationSeconds,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
