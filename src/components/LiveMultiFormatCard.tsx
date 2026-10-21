import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Maximize2,
  Trash2,
  RefreshCw,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Zap,
  ZoomIn,
  ZoomOut,
  Layers,
  Monitor,
  Smartphone,
  Upload,
} from 'lucide-react';
import JSZip from 'jszip';
import { Parser as SvgaLiteParser, Player as SvgaLitePlayer } from 'svga.lite';
import {
  extractVapConfigFromBlob,
  detectVapChannelLayout,
  VapConfig,
  VapDetectionResult,
  WebGLVapRenderer,
} from '../utils/vapEngine';
import { WatermarkConfig, drawAnimatedWatermark } from '../utils/watermarkAndBackground';
import {
  ShowcaseFormatType,
  AlphaLayoutOverrideMode,
  classifyFileExtension,
  getFormatBadgeMeta,
  computeDualChannelRects,
} from '../utils/multiFormatShowcaseHelpers';

declare var SVGA: any;

export type StageBgMode = 'checkerboard' | 'dark' | 'green' | 'white' | 'custom';

export interface LiveMultiFormatCardProps {
  id: string;
  file: File;
  status?: 'pending' | 'processing' | 'done' | 'error';
  progress?: number;
  error?: string;
  resultUrl?: string;
  targetFormat?: string;
  onChangeTargetFormat?: (id: string, format: any) => void;
  onConvertSingle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onInspectFull?: (item: {
    id: string;
    name: string;
    file: File;
    url: string;
    format: any;
    size: number;
  }) => void;
  onPreviewResult?: (url: string, name: string, format: any) => void;
  onDownloadResult?: () => void;
  globalPaused?: boolean;
  globalBgMode?: StageBgMode;
  customBgUrl?: string | null;
  watermarkConfig?: WatermarkConfig;
  isProcessingBatch?: boolean;
  demoPreset?: 'dragon_gold' | 'royal_crown' | 'cyber_portal';
  slotIndex?: number;
  slotSubtitle?: string;
  isCompanionMirror?: boolean;
  onUploadIntoSlot?: (file: File) => void;
  isNormalMode?: boolean;
}

const ALPHA_MODE_LABELS: Record<AlphaLayoutOverrideMode, string> = {
  auto: 'تلقائي ذكي ✨',
  vap_half_right: 'ألفا مصغر يمين ↗️',
  vap_half_left: 'ألفا مصغر يسار ↖️',
  yyeva_50: 'ألفا 50/50 يمين ➡️',
  vap_50: 'ألفا 50/50 يسار ⬅️',
  top_bottom: 'ألفا عمودي ⬆️⬇️',
  full: 'فيديو كامل 🎬',
};

export const LiveMultiFormatCard: React.FC<LiveMultiFormatCardProps> = ({
  id,
  file,
  status = 'pending',
  progress = 0,
  error,
  resultUrl,
  targetFormat = 'yyeva',
  onChangeTargetFormat,
  onConvertSingle,
  onRemove,
  onInspectFull,
  onPreviewResult,
  onDownloadResult,
  globalPaused = false,
  globalBgMode = 'checkerboard',
  customBgUrl,
  watermarkConfig,
  isProcessingBatch = false,
  demoPreset,
  slotIndex,
  slotSubtitle,
  isCompanionMirror = false,
  onUploadIntoSlot,
  isNormalMode = false,
}) => {
  const [detectedFormat, setDetectedFormat] = useState<ShowcaseFormatType>(() =>
    classifyFileExtension(file.name)
  );
  const [formatOverride, setFormatOverride] = useState<ShowcaseFormatType | null>(null);
  const [alphaModeOverride, setAlphaModeOverride] = useState<AlphaLayoutOverrideMode>('auto');
  const [vapConfig, setVapConfig] = useState<VapConfig | null>(null);
  const [detectedLayout, setDetectedLayout] = useState<VapDetectionResult | null>(null);
  const [isHalfScaleAlpha, setIsHalfScaleAlpha] = useState<boolean>(false);
  const [showPhoneFrame, setShowPhoneFrame] = useState<boolean>(false);
  const [localNormalMode, setLocalNormalMode] = useState<boolean>(isNormalMode);

  useEffect(() => {
    setLocalNormalMode(isNormalMode);
  }, [isNormalMode]);

  const effectiveNormalMode = localNormalMode;

  const activeFormat: ShowcaseFormatType =
    alphaModeOverride === 'full' ? 'mp4' : formatOverride || detectedFormat;

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [hasAudio, setHasAudio] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 750,
    height: 750,
  });
  const [fps, setFps] = useState<number>(30);
  const [totalFrames, setTotalFrames] = useState<number>(90);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fallbackProcedural, setFallbackProcedural] = useState<boolean>(Boolean(demoPreset));
  const [objectUrl, setObjectUrl] = useState<string>('');

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgaContainerRef = useRef<HTMLDivElement>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const svgaPlayerRef = useRef<any>(null);
  const pngFramesRef = useRef<HTMLImageElement[]>([]);
  const vapConfigRef = useRef<VapConfig | null>(null);
  const detectedLayoutRef = useRef<VapDetectionResult | null>(null);
  const webglVapRendererRef = useRef<WebGLVapRenderer | null>(null);
  const opticalRecheckedRef = useRef<boolean>(false);

  const effectivePlaying = isPlaying && !globalPaused;

  // Create object URL for the uploaded file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Detect accurate format and extract embedded MP4 vapc / yyea binary box coordinates
  useEffect(() => {
    let cancelled = false;
    vapConfigRef.current = null;
    detectedLayoutRef.current = null;
    opticalRecheckedRef.current = false;
    setVapConfig(null);
    setDetectedLayout(null);
    setFormatOverride(null);
    setAlphaModeOverride('auto');

    const detect = async () => {
      const initial = classifyFileExtension(file.name);
      if (initial === 'mp4' || initial === 'yyeva' || initial === 'vap') {
        try {
          const config = await extractVapConfigFromBlob(file);
          if (!cancelled && config?.info) {
            vapConfigRef.current = config;
            setVapConfig(config);

            const rgb = config.info.rgbFrame || [];
            const alpha = config.info.aFrame || [];
            const halfScale =
              Boolean(config.info.isHalfScaleAlpha) ||
              (rgb.length >= 4 &&
                alpha.length >= 4 &&
                (alpha[2] <= rgb[2] * 0.75 || alpha[3] <= rgb[3] * 0.75));
            setIsHalfScaleAlpha(halfScale);

            const outW = config.info.w || rgb[2] || 750;
            const outH = config.info.h || rgb[3] || 1334;
            setDimensions({ width: outW, height: outH });
            if (config.info.fps && config.info.fps > 0 && config.info.fps <= 120) {
              setFps(config.info.fps);
            }
            if (config.info.f && config.info.f > 0) {
              setTotalFrames(config.info.f);
            }

            if (alpha[0] < rgb[0]) {
              setDetectedFormat('vap');
              return;
            }
            setDetectedFormat('yyeva');
            return;
          }
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        setDetectedFormat(initial);
      }
    };
    detect();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Load SVGA file when activeFormat === 'svga'
  useEffect(() => {
    if (activeFormat !== 'svga' || !objectUrl || demoPreset) return;

    let cancelled = false;
    setIsLoading(true);
    setFallbackProcedural(false);

    const loadSvgaEffect = async () => {
      try {
        const buffer = await file.arrayBuffer();
        if (cancelled) return;

        // Try global SVGA player first, then svga.lite
        const svgaGlobal = typeof window !== 'undefined' ? (window as any).SVGA : undefined;
        if (svgaGlobal && svgaContainerRef.current) {
          await new Promise<void>((resolve, reject) => {
            const parser = new svgaGlobal.Parser();
            parser.load(
              objectUrl,
              (videoItem: any) => {
                if (cancelled || !svgaContainerRef.current) return resolve();
                const w = videoItem.videoSize?.width || 750;
                const h = videoItem.videoSize?.height || 750;
                const f = videoItem.FPS || 30;
                const tf = videoItem.frames || 60;
                setDimensions({ width: w, height: h });
                setFps(f);
                setTotalFrames(tf);
                setHasAudio(Boolean(videoItem.audios && videoItem.audios.length > 0));

                svgaContainerRef.current.innerHTML = '';
                const player = new svgaGlobal.Player(svgaContainerRef.current);
                player.loops = 0;
                player.clearsAfterStop = false;
                if (typeof player.setContentMode === 'function') {
                  player.setContentMode('AspectFit');
                }
                player.setVideoItem(videoItem);
                player.startAnimation();
                if (typeof player.onFrame === 'function') {
                  player.onFrame((frame: number) => {
                    setCurrentFrame(frame);
                  });
                }
                svgaPlayerRef.current = {
                  type: 'global',
                  instance: player,
                  start: () => player.startAnimation(),
                  pause: () => player.pauseAnimation(),
                  replay: () => {
                    player.stepToFrame(0, true);
                  },
                };
                setIsLoading(false);
                resolve();
              },
              (err: any) => reject(err)
            );
          });
          return;
        }

        // Fallback to svga.lite
        const parser = new SvgaLiteParser();
        const videoItem = await parser.do(buffer);
        if (cancelled || !canvasRef.current) return;

        const w = videoItem.videoSize?.width || 750;
        const h = videoItem.videoSize?.height || 750;
        const f = videoItem.FPS || 30;
        const tf = videoItem.frames || 60;
        setDimensions({ width: w, height: h });
        setFps(f);
        setTotalFrames(tf);

        canvasRef.current.width = w;
        canvasRef.current.height = h;
        const player = new SvgaLitePlayer(canvasRef.current);
        await player.mount(videoItem);
        (player as any).set({ loop: 0, fillMode: 'forwards' });
        (player as any).onProcess = (prog: number) => {
          setCurrentFrame(Math.min(tf - 1, Math.floor(prog * tf)));
        };
        player.start();
        svgaPlayerRef.current = {
          type: 'lite',
          instance: player,
          start: () => player.start(),
          pause: () => player.pause(),
          replay: () => {
            if (typeof (player as any).stepToFrame === 'function') {
              (player as any).stepToFrame(0, true);
            } else {
              player.start();
            }
          },
        };
        setIsLoading(false);
      } catch {
        // If a synthetic or non-standard SVGA file is passed, show live procedural effect preview
        if (!cancelled) {
          setFallbackProcedural(true);
          setIsLoading(false);
        }
      }
    };

    loadSvgaEffect();

    return () => {
      cancelled = true;
      if (svgaPlayerRef.current) {
        try {
          svgaPlayerRef.current.pause();
        } catch {}
        svgaPlayerRef.current = null;
      }
    };
  }, [activeFormat, objectUrl, file, demoPreset]);

  // Load ZIP PNG sequence when activeFormat === 'png_seq'
  useEffect(() => {
    if (activeFormat !== 'png_seq' || demoPreset) return;

    let cancelled = false;
    setIsLoading(true);
    setFallbackProcedural(false);

    const loadZip = async () => {
      try {
        const buf = await file.arrayBuffer();
        const zip = new JSZip();
        const content = await zip.loadAsync(buf);
        const pngNames = Object.keys(content.files)
          .filter(
            (n) =>
              n.toLowerCase().endsWith('.png') &&
              !n.startsWith('__MACOSX') &&
              !n.includes('/.')
          )
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (pngNames.length === 0) throw new Error('No PNGs in ZIP');

        const loadedImages: HTMLImageElement[] = [];
        for (const name of pngNames.slice(0, 120)) {
          if (cancelled) return;
          const blob = await content.files[name].async('blob');
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.src = url;
          await new Promise((r) => {
            img.onload = () => r(true);
            img.onerror = () => r(false);
          });
          loadedImages.push(img);
        }

        if (cancelled) return;
        pngFramesRef.current = loadedImages;
        const w = loadedImages[0]?.naturalWidth || 600;
        const h = loadedImages[0]?.naturalHeight || 600;
        setDimensions({ width: w, height: h });
        setTotalFrames(loadedImages.length);
        setFps(24);
        if (canvasRef.current) {
          canvasRef.current.width = w;
          canvasRef.current.height = h;
        }
        setIsLoading(false);
      } catch {
        if (!cancelled) {
          setFallbackProcedural(true);
          setIsLoading(false);
        }
      }
    };

    loadZip();
    return () => {
      cancelled = true;
    };
  }, [activeFormat, file, demoPreset]);

  // Animate PNG sequence frames
  useEffect(() => {
    if (
      activeFormat !== 'png_seq' ||
      fallbackProcedural ||
      pngFramesRef.current.length === 0 ||
      !effectivePlaying
    ) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % pngFramesRef.current.length;
        const cvs = canvasRef.current;
        const ctx = cvs?.getContext('2d');
        const img = pngFramesRef.current[next];
        if (cvs && ctx && img) {
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
        }
        return next;
      });
    }, 1000 / 24);

    return () => clearInterval(timer);
  }, [activeFormat, fallbackProcedural, effectivePlaying]);

  // Load Video formats (YYEVA, VAP, MP4, WebM)
  useEffect(() => {
    if (
      !objectUrl ||
      demoPreset ||
      activeFormat === 'svga' ||
      activeFormat === 'png_seq' ||
      activeFormat === 'gif' ||
      activeFormat === 'webp' ||
      activeFormat === 'image'
    ) {
      return;
    }

    setIsLoading(true);
    setFallbackProcedural(false);
    const vid = videoRef.current;
    if (!vid) return;

    vid.src = objectUrl;
    vid.loop = true;
    vid.muted = isMuted;
    vid.playsInline = true;
    vid.load();
  }, [objectUrl, demoPreset, detectedFormat]);

  // Video Render Loop (YYEVA / VAP Dual-Channel Alpha or Standard WebM/MP4)
  useEffect(() => {
    if (
      demoPreset ||
      fallbackProcedural ||
      (activeFormat !== 'yyeva' &&
        activeFormat !== 'vap' &&
        activeFormat !== 'mp4' &&
        activeFormat !== 'webm')
    ) {
      return;
    }

    const vid = videoRef.current;
    const cvs = canvasRef.current;
    if (!vid || !cvs) return;

    let rafId: number;

    const renderTick = () => {
      if (vid.readyState >= 2) {
        const rawW = vid.videoWidth || 750;
        const rawH = vid.videoHeight || 750;

        // Re-check optical layout once a visible non-zero frame is playing if no binary vapc config was found
        if (
          !vapConfigRef.current?.info &&
          !opticalRecheckedRef.current &&
          vid.currentTime > 0.06
        ) {
          opticalRecheckedRef.current = true;
          const refined = detectVapChannelLayout(vid, null);
          if (refined.confidence >= 0.85) {
            detectedLayoutRef.current = refined;
            setDetectedLayout(refined);
            if (!refined.isVap && alphaModeOverride === 'auto' && !formatOverride) {
              setDetectedFormat('mp4');
            } else if (refined.isVap && alphaModeOverride === 'auto' && !formatOverride) {
              setDetectedFormat(
                refined.layout === 'right_rgb_left_alpha' ? 'vap' : 'yyeva'
              );
              setIsHalfScaleAlpha(
                refined.aFrame[2] <= refined.rgbFrame[2] * 0.75 ||
                  refined.aFrame[3] <= refined.rgbFrame[3] * 0.75
              );
            }
          }
        }

        const effectiveMode: 'yyeva' | 'vap' | 'full' | AlphaLayoutOverrideMode =
          alphaModeOverride !== 'auto'
            ? alphaModeOverride
            : activeFormat === 'yyeva' || activeFormat === 'vap'
            ? activeFormat
            : 'full';

        const rects = computeDualChannelRects(
          rawW,
          rawH,
          effectiveMode,
          vapConfigRef.current?.info as any,
          detectedLayoutRef.current
        );

        const isDual =
          effectiveMode !== 'full' &&
          (activeFormat === 'yyeva' ||
            activeFormat === 'vap' ||
            alphaModeOverride !== 'auto');

        if (cvs.width !== rects.renderWidth) cvs.width = rects.renderWidth;
        if (cvs.height !== rects.renderHeight) cvs.height = rects.renderHeight;

        setDimensions((prev) =>
          prev.width === rects.renderWidth && prev.height === rects.renderHeight
            ? prev
            : { width: rects.renderWidth, height: rects.renderHeight }
        );

        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, rects.renderWidth, rects.renderHeight);

          if (isDual) {
            if (!webglVapRendererRef.current) {
              webglVapRendererRef.current = new WebGLVapRenderer(
                rects.renderWidth,
                rects.renderHeight
              );
            } else {
              webglVapRendererRef.current.resize(rects.renderWidth, rects.renderHeight);
            }

            const renderedCanvas = webglVapRendererRef.current.render(
              vid,
              rects.rgbFrame,
              rects.aFrame,
              8,
              false,
              false,
              false
            );
            ctx.drawImage(renderedCanvas, 0, 0, rects.renderWidth, rects.renderHeight);
          } else {
            ctx.drawImage(vid, 0, 0, rects.renderWidth, rects.renderHeight);
          }
        }

        if (!vid.paused && !vid.ended) {
          const f = Math.round(vid.currentTime * fps);
          setCurrentFrame((prev) => (prev === f ? prev : f));
        }
      }
      rafId = requestAnimationFrame(renderTick);
    };

    rafId = requestAnimationFrame(renderTick);
    return () => cancelAnimationFrame(rafId);
  }, [activeFormat, alphaModeOverride, formatOverride, vapConfig, detectedLayout, demoPreset, fallbackProcedural, fps]);

  // Procedural Live Royal Effect Renderer (Used for built-in Demo Effects or synthetic test files)
  useEffect(() => {
    if (!fallbackProcedural && !demoPreset) return;
    const cvs = canvasRef.current;
    if (!cvs) return;

    cvs.width = 600;
    cvs.height = 600;
    setDimensions({ width: 750, height: 750 });
    setFps(30);
    setTotalFrames(90);
    setIsLoading(false);

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let rafId: number;

    const preset =
      demoPreset ||
      (activeFormat === 'yyeva'
        ? 'dragon_gold'
        : activeFormat === 'vap'
        ? 'royal_crown'
        : 'cyber_portal');

    const drawEffect = () => {
      if (effectivePlaying) {
        frame = (frame + 1) % 180;
        setCurrentFrame(frame % 90);
      }

      const t = frame * 0.045;
      const w = cvs.width;
      const h = cvs.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Outer magical aura glow
      const auraGrad = ctx.createRadialGradient(
        cx,
        cy,
        20,
        cx,
        cy,
        230 + Math.sin(t * 2) * 20
      );
      if (preset === 'dragon_gold') {
        auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.48)');
        auraGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (preset === 'royal_crown') {
        auraGrad.addColorStop(0, 'rgba(236, 72, 153, 0.48)');
        auraGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        auraGrad.addColorStop(0, 'rgba(34, 211, 238, 0.48)');
        auraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 250, 0, Math.PI * 2);
      ctx.fill();

      // Rotating sacred geometry / energy rings
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.6);
      ctx.strokeStyle =
        preset === 'dragon_gold'
          ? 'rgba(253, 224, 71, 0.75)'
          : preset === 'royal_crown'
          ? 'rgba(244, 114, 182, 0.75)'
          : 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 165, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-t * 1.2);
      ctx.setLineDash([8, 14]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 125, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Orbiting glowing particles
      const particleCount = 18;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + t * 1.1;
        const radius = 95 + Math.sin(t * 2.5 + i) * 65;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius * 0.85;
        const size = 3.5 + Math.sin(t * 3 + i) * 2;

        ctx.save();
        ctx.fillStyle =
          preset === 'dragon_gold'
            ? '#fef08a'
            : preset === 'royal_crown'
            ? '#fbcfe8'
            : '#a5f3fc';
        ctx.shadowColor =
          preset === 'dragon_gold'
            ? '#f59e0b'
            : preset === 'royal_crown'
            ? '#ec4899'
            : '#06b6d4';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.5, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Central animated emblem crest
      ctx.save();
      ctx.translate(cx, cy + Math.sin(t * 2.2) * 8);
      const pulseScale = 1 + Math.sin(t * 3) * 0.06;
      ctx.scale(pulseScale, pulseScale);

      ctx.beginPath();
      if (preset === 'dragon_gold') {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? 78 : 36;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else if (preset === 'royal_crown') {
        ctx.moveTo(-70, 40);
        ctx.lineTo(-85, -35);
        ctx.lineTo(-35, 5);
        ctx.lineTo(0, -65);
        ctx.lineTo(35, 5);
        ctx.lineTo(85, -35);
        ctx.lineTo(70, 40);
      } else {
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const x = Math.cos(a) * 74;
          const y = Math.sin(a) * 74;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      const coreGrad = ctx.createLinearGradient(-70, -70, 70, 70);
      if (preset === 'dragon_gold') {
        coreGrad.addColorStop(0, '#fef08a');
        coreGrad.addColorStop(0.5, '#f59e0b');
        coreGrad.addColorStop(1, '#b45309');
      } else if (preset === 'royal_crown') {
        coreGrad.addColorStop(0, '#fbcfe8');
        coreGrad.addColorStop(0.5, '#ec4899');
        coreGrad.addColorStop(1, '#6d28d9');
      } else {
        coreGrad.addColorStop(0, '#cffafe');
        coreGrad.addColorStop(0.5, '#06b6d4');
        coreGrad.addColorStop(1, '#3b82f6');
      }

      ctx.fillStyle = coreGrad;
      ctx.shadowColor =
        preset === 'dragon_gold'
          ? 'rgba(245, 158, 11, 0.85)'
          : preset === 'royal_crown'
          ? 'rgba(236, 72, 153, 0.85)'
          : 'rgba(6, 182, 212, 0.85)';
      ctx.shadowBlur = 28;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = '900 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 8;
      ctx.fillText(
        preset === 'dragon_gold'
          ? '★ VIP ROYAL DRAGON • SVGA ★'
          : preset === 'royal_crown'
          ? '♛ IMPERIAL CROWN • YYEVA ♛'
          : '◈ NEON PORTAL • TENCENT VAP ◈',
        0,
        118
      );
      ctx.restore();

      rafId = requestAnimationFrame(drawEffect);
    };

    rafId = requestAnimationFrame(drawEffect);
    return () => cancelAnimationFrame(rafId);
  }, [fallbackProcedural, demoPreset, activeFormat, effectivePlaying]);

  // Sync Play/Pause state with SVGA and Video players
  useEffect(() => {
    if (svgaPlayerRef.current) {
      try {
        if (effectivePlaying) svgaPlayerRef.current.start();
        else svgaPlayerRef.current.pause();
      } catch {}
    }
    if (videoRef.current) {
      if (effectivePlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [effectivePlaying]);

  // Live Anti-Theft Watermark Overlay Loop on the Card Stage
  useEffect(() => {
    if (!watermarkConfig?.enabled || !watermarkCanvasRef.current) return;
    const cvs = watermarkCanvasRef.current;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let fCount = 0;
    const renderWatermark = () => {
      if (cvs.width !== cvs.clientWidth || cvs.height !== cvs.clientHeight) {
        cvs.width = cvs.clientWidth || 360;
        cvs.height = cvs.clientHeight || 300;
      }
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      drawAnimatedWatermark(ctx, cvs.width, cvs.height, fCount, 120, watermarkConfig);
      if (effectivePlaying) {
        fCount = (fCount + 1) % 120;
      }
      animId = requestAnimationFrame(renderWatermark);
    };
    animId = requestAnimationFrame(renderWatermark);
    return () => cancelAnimationFrame(animId);
  }, [watermarkConfig, effectivePlaying]);

  const handleVideoLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const rawW = vid.videoWidth || 750;
    const rawH = vid.videoHeight || 750;
    const detection = detectVapChannelLayout(vid, vapConfigRef.current);
    detectedLayoutRef.current = detection;
    setDetectedLayout(detection);

    const halfAlpha =
      Boolean(vapConfigRef.current?.info?.isHalfScaleAlpha) ||
      detection.aFrame[2] <= detection.rgbFrame[2] * 0.75 ||
      detection.aFrame[3] <= detection.rgbFrame[3] * 0.75;
    setIsHalfScaleAlpha(halfAlpha);

    if (!formatOverride && alphaModeOverride === 'auto') {
      if (!detection.isVap && !vapConfigRef.current?.info) {
        setDetectedFormat('mp4');
      } else if (detection.layout === 'right_rgb_left_alpha') {
        setDetectedFormat('vap');
      } else if (detection.layout === 'left_rgb_right_alpha') {
        setDetectedFormat('yyeva');
      }
    }

    const rects = computeDualChannelRects(
      rawW,
      rawH,
      alphaModeOverride !== 'auto'
        ? alphaModeOverride
        : detection.isVap || vapConfigRef.current?.info
        ? detection.layout === 'right_rgb_left_alpha'
          ? 'vap'
          : 'yyeva'
        : 'full',
      vapConfigRef.current?.info as any,
      detection
    );

    setDimensions({ width: rects.renderWidth, height: rects.renderHeight });
    const f = vapConfigRef.current?.info?.fps || detection.fps || 24;
    setFps(f);
    setTotalFrames(
      vapConfigRef.current?.info?.f || Math.max(1, Math.round((vid.duration || 2) * f))
    );
    setIsLoading(false);

    if (effectivePlaying) {
      vid.play().catch(() => {});
    }
  };

  const handleVideoError = () => {
    setFallbackProcedural(true);
    setIsLoading(false);
  };

  const handleReplay = () => {
    setCurrentFrame(0);
    if (svgaPlayerRef.current) {
      try {
        svgaPlayerRef.current.replay();
      } catch {}
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  };

  // Cycle through smart alpha modes (Auto -> Half-Scale Top-Right -> YYEVA 50/50 -> VAP 50/50 -> Full MP4)
  const cycleAlphaMode = () => {
    const order: AlphaLayoutOverrideMode[] = [
      'auto',
      'vap_half_right',
      'yyeva_50',
      'vap_50',
      'full',
    ];
    const nextIdx = (order.indexOf(alphaModeOverride) + 1) % order.length;
    const nextMode = order[nextIdx];
    setAlphaModeOverride(nextMode);

    if (nextMode === 'vap_50' || nextMode === 'vap_half_left') {
      setFormatOverride('vap');
    } else if (nextMode === 'yyeva_50' || nextMode === 'vap_half_right') {
      setFormatOverride('yyeva');
    } else if (nextMode === 'full') {
      setFormatOverride('mp4');
    } else {
      setFormatOverride(null);
    }
  };

  const badgeMeta = getFormatBadgeMeta(activeFormat, isHalfScaleAlpha);
  const isPortrait = dimensions.height > dimensions.width * 1.15;

  const getStageBgClass = () => {
    if (customBgUrl && globalBgMode === 'custom') return 'bg-slate-950';
    switch (globalBgMode) {
      case 'dark':
        return 'bg-[radial-gradient(circle_at_center,#131c38_0%,#03060c_100%)]';
      case 'green':
        return 'bg-[#00b140]';
      case 'white':
        return 'bg-slate-100';
      case 'checkerboard':
      default:
        return 'bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[size:20px_20px] bg-[#070b16]';
    }
  };

  return (
    <div
      data-testid={`live-effect-card-${id}`}
      data-mode={effectiveNormalMode ? 'normal' : 'effects'}
      className={`group relative backdrop-blur-2xl bg-gradient-to-b from-white/[0.07] via-slate-900/75 to-slate-950/90 hover:from-white/[0.11] hover:via-slate-900/85 hover:to-slate-950/95 rounded-2xl border ${
        isCompanionMirror
          ? 'border-indigo-400/30 hover:border-indigo-400/60'
          : effectiveNormalMode
          ? 'border-cyan-400/25 hover:border-cyan-400/50'
          : 'border-white/[0.14] hover:border-pink-400/55'
      } transition-all duration-300 shadow-[0_14px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col overflow-hidden`}
    >
      {/* Hidden Slot File Input if onUploadIntoSlot is provided */}
      {onUploadIntoSlot && (
        <input
          type="file"
          ref={slotFileInputRef}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onUploadIntoSlot(f);
              e.target.value = '';
            }
          }}
          accept=".svga,.mp4,.webm,.gif,.zip,.vap,.webp,.png,.jpg,.pag,video/*,image/*"
          className="hidden"
        />
      )}

      {/* Top Glass Status & Format Ribbon */}
      <div className="px-3.5 py-2.5 bg-white/[0.04] backdrop-blur-xl border-b border-white/[0.1] flex flex-wrap items-center justify-between gap-1.5 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          {slotIndex !== undefined && (
            <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[10px] font-black shrink-0 tabular-nums">
              #{slotIndex}
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-xl border text-[10px] font-black tracking-wide shrink-0 whitespace-nowrap shadow-sm ${badgeMeta.colorClass}`}
          >
            {badgeMeta.label}
          </span>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle between Normal Mode (No Effects) & Live Effects Mode */}
          <button
            type="button"
            onClick={() => setLocalNormalMode(!localNormalMode)}
            className={`px-2 py-1 rounded-xl border text-[10px] font-black flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              effectiveNormalMode
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-sm'
                : 'bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 border-white/[0.12]'
            }`}
            title={
              effectiveNormalMode
                ? 'المود العادي مفعّل (بدون أي تأثيرات) - اضغط لتشغيل عرض التأثيرات'
                : 'التبديل إلى المود العادي (ملف مرفوع عادي بدون أي تأثيرات)'
            }
          >
            <span>{effectiveNormalMode ? 'المود العادي 📁' : 'مود التأثيرات ✨'}</span>
          </button>

          {!effectiveNormalMode &&
            (activeFormat === 'yyeva' ||
              activeFormat === 'vap' ||
              detectedFormat === 'mp4' ||
              detectedFormat === 'yyeva' ||
              detectedFormat === 'vap') && (
              <button
                type="button"
                onClick={cycleAlphaMode}
                className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/35 text-[10px] font-black flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                title="تبديل نظام قراءة قناة الشفافية Alpha (تلقائي ذكي vapc / ألفا مصغر أعلى اليمين / ألفا 50/50 / فيديو كامل)"
              >
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>{ALPHA_MODE_LABELS[alphaModeOverride]}</span>
              </button>
            )}

          {!effectiveNormalMode && (
            <button
              type="button"
              onClick={() => setShowPhoneFrame(!showPhoneFrame)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                showPhoneFrame
                  ? 'bg-sky-500 text-white border-sky-400 shadow'
                  : 'bg-white/[0.06] hover:bg-white/[0.15] text-slate-300 border-white/[0.12]'
              }`}
              title="محاكاة إطار شاشة الجوال داخل البطاقة"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          )}

          {onInspectFull && (
            <button
              type="button"
              onClick={() =>
                onInspectFull({
                  id,
                  name: file.name,
                  file,
                  url: objectUrl,
                  format: activeFormat,
                  size: file.size,
                })
              }
              className="p-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500 text-indigo-200 hover:text-white border border-indigo-400/35 transition-all cursor-pointer shrink-0"
              title="تكبير وفتح في المشغل التفصيلي الشامل"
              aria-label={`تكبير معاينة ${file.name}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onRemove && !isCompanionMirror && (
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white border border-red-400/30 transition-all cursor-pointer shrink-0"
              title="حذف هذا الملف"
              aria-label={`حذف ${file.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stage Area: Either Clean Normal Mode (No Effects) OR Live Animation Stage */}
      {effectiveNormalMode ? (
        <div
          data-testid={`normal-mode-stage-${id}`}
          className="relative w-full py-7 px-5 bg-gradient-to-b from-slate-950/60 to-slate-900/40 flex flex-col items-center justify-center gap-3 text-center border-b border-white/[0.08]"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.15] backdrop-blur-xl flex items-center justify-center shadow-inner">
            <Layers className="w-7 h-7 text-cyan-300" />
          </div>
          <div className="space-y-1 max-w-full">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-3 py-0.5 rounded-lg">
              <span>المود العادي • ملف مرفوع عادي بدون أي تأثيرات</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              يتم عرض الملف كما تم رفعه بدون تشغيل أي فلاتر أو تأثيرات بصرية أو علامات مائية
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 pt-1" dir="ltr">
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span>·</span>
            <span>{activeFormat.toUpperCase()}</span>
            <span>·</span>
            <span>
              {status === 'done'
                ? 'READY'
                : status === 'processing'
                ? `${progress}%`
                : 'UPLOADED'}
            </span>
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          className={`relative w-full h-[260px] sm:h-[280px] flex items-center justify-center overflow-hidden select-none ${getStageBgClass()}`}
        >
          {/* Top-Right Live Status Indicator */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 text-[10px] font-black text-emerald-200 bg-slate-950/75 backdrop-blur-xl border border-white/[0.15] px-2.5 py-1 rounded-xl shadow-lg pointer-events-none">
            <span>{slotSubtitle || (effectivePlaying ? 'عرض حي مباشر' : 'متوقف مؤقتاً')}</span>
          </div>

          {/* Optional Upload Replacement Button on Companion Mirror Cards */}
          {isCompanionMirror && onUploadIntoSlot && (
            <button
              type="button"
              onClick={() => slotFileInputRef.current?.click()}
              className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/50 text-[10px] font-black flex items-center gap-1 shadow-lg cursor-pointer transition-all"
              title="رفع ملف مستقل في هذه الخانة"
            >
              <Upload className="w-3 h-3" />
              <span>+ رفع ملف بالخانة #{slotIndex}</span>
            </button>
          )}

          {/* Custom Background Image */}
          {customBgUrl && (
            <img
              src={customBgUrl}
              alt="خلفية العرض"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            />
          )}

          {/* Subtle radial spotlight behind transparent effects */}
          {!customBgUrl && globalBgMode === 'checkerboard' && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12)_0%,transparent_70%)] pointer-events-none z-0" />
          )}

          {/* Optional Mobile Phone Simulator Bezel */}
          {showPhoneFrame && (
            <div className="absolute inset-y-3 w-[195px] rounded-[2rem] border-2 border-white/25 bg-black/20 pointer-events-none z-20 shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col justify-between p-2">
              <div className="w-14 h-1.5 bg-white/25 rounded-full mx-auto" />
              <div className="w-20 h-1 bg-white/25 rounded-full mx-auto" />
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 text-pink-500 animate-spin" />
              <span className="text-xs font-black text-slate-300">
                جاري تشغيل التأثير الحي...
              </span>
            </div>
          )}

          {/* Hidden HTML5 Video Source for YYEVA / VAP / MP4 / WebM */}
          <video
            ref={videoRef}
            playsInline
            muted={isMuted}
            loop
            onLoadedMetadata={handleVideoLoadedMetadata}
            onError={handleVideoError}
            className="hidden"
          />

          {/* SVGA Global Container */}
          {activeFormat === 'svga' && !fallbackProcedural && !demoPreset && (
            <div
              ref={svgaContainerRef}
              style={{ transform: `scale(${zoom})` }}
              className="relative z-10 w-full h-full flex items-center justify-center p-2 transition-transform duration-200 pointer-events-none"
            />
          )}

          {/* Canvas Renderer for YYEVA, VAP, WebM, MP4, PNG Sequence, svga.lite, or Procedural Effect */}
          {(fallbackProcedural ||
            Boolean(demoPreset) ||
            activeFormat === 'yyeva' ||
            activeFormat === 'vap' ||
            activeFormat === 'webm' ||
            activeFormat === 'mp4' ||
            activeFormat === 'png_seq' ||
            activeFormat === 'svga') && (
            <canvas
              ref={canvasRef}
              style={{ transform: `scale(${zoom})` }}
              className={`relative z-10 max-h-[250px] max-w-[95%] object-contain transition-transform duration-200 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)] ${
                activeFormat === 'svga' &&
                !fallbackProcedural &&
                !demoPreset &&
                svgaPlayerRef.current?.type === 'global'
                  ? 'hidden'
                  : 'block'
              }`}
            />
          )}

          {/* Animated GIF / WebP / Static Image Preview */}
          {(activeFormat === 'gif' || activeFormat === 'webp' || activeFormat === 'image') &&
            !fallbackProcedural &&
            !demoPreset &&
            objectUrl && (
              <img
                src={objectUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setDimensions({
                    width: img.naturalWidth || 600,
                    height: img.naturalHeight || 600,
                  });
                  setIsLoading(false);
                }}
                onError={() => {
                  setFallbackProcedural(true);
                  setIsLoading(false);
                }}
                style={{ transform: `scale(${zoom})` }}
                className="relative z-10 max-h-[250px] max-w-[95%] object-contain transition-transform duration-200 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)]"
              />
            )}

          {/* Live Animated Anti-Theft Watermark Canvas */}
          {watermarkConfig?.enabled && (
            <canvas
              ref={watermarkCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            />
          )}

          {/* Bottom-Left Specs & Dimensions */}
          <div
            className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/75 backdrop-blur-xl border border-white/[0.15] text-[10px] font-mono font-bold text-slate-200 shadow-lg tabular-nums"
            dir="ltr"
          >
            {isPortrait ? (
              <Smartphone className="w-3 h-3 text-sky-400" />
            ) : (
              <Monitor className="w-3 h-3 text-pink-400" />
            )}
            <span>
              {dimensions.width}×{dimensions.height}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">{fps}FPS</span>
          </div>

          {/* Bottom-Right Live Transport Mini Bar */}
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur-xl p-1 rounded-xl border border-white/[0.15] shadow-lg">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-7 h-7 rounded-lg bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center transition-all cursor-pointer"
              title={effectivePlaying ? 'إيقاف مؤقت للتأثير' : 'تشغيل التأثير'}
              aria-label={effectivePlaying ? `إيقاف ${file.name}` : `تشغيل ${file.name}`}
            >
              {effectivePlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
              title="إعادة التأثير من البداية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => (z >= 1.4 ? 0.8 : Number((z + 0.2).toFixed(1))))}
              className="px-1.5 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono font-black text-cyan-300 flex items-center justify-center transition-all cursor-pointer tabular-nums"
              title="تكبير / تصغير حجم التأثير داخل البطاقة"
            >
              {Math.round(zoom * 100)}%
            </button>

            {(hasAudio ||
              activeFormat === 'mp4' ||
              activeFormat === 'yyeva' ||
              activeFormat === 'vap' ||
              activeFormat === 'webm') && (
              <button
                type="button"
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (videoRef.current) videoRef.current.muted = next;
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  !isMuted
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-400'
                }`}
                title={isMuted ? 'تشغيل الصوت المدمج' : 'كتم الصوت'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card Footer: File Info, Target Conversion Format & Action Buttons */}
      <div className="p-4 bg-white/[0.03] backdrop-blur-xl border-t border-white/[0.1] flex flex-col gap-3 flex-1 justify-between">
        {/* File Name & Size */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-right">
            <h4 className="text-white font-black text-sm truncate" title={file.name}>
              {file.name}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {slotSubtitle || badgeMeta.description}
            </p>
          </div>
          <span
            className="text-[11px] font-mono font-black text-slate-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 shrink-0"
            dir="ltr"
          >
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>

        {/* Progress Bar when Processing */}
        {status === 'processing' && (
          <div className="space-y-1.5 bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-2xl">
            <div className="flex items-center justify-between text-[11px] font-black text-pink-300">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                جاري تحويل ورندر التأثير...
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message if any */}
        {status === 'error' && error && (
          <div className="px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-xl text-[11px] font-bold text-red-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Target Format & Convert / Download Controls */}
        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          {isCompanionMirror && onUploadIntoSlot ? (
            <button
              type="button"
              onClick={() => slotFileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملف آخر مستقل في الخانة #{slotIndex}</span>
            </button>
          ) : (
            <>
              {onChangeTargetFormat && (
                <div className="flex items-center justify-between gap-2 bg-black/50 px-3 py-2 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-slate-400 shrink-0">
                    تحويل إلى:
                  </span>
                  <select
                    value={targetFormat}
                    onChange={(e) => onChangeTargetFormat(id, e.target.value)}
                    disabled={status === 'processing' || isProcessingBatch}
                    className="bg-transparent text-pink-400 font-black text-xs focus:outline-none cursor-pointer text-left"
                  >
                    <option value="yyeva" className="bg-slate-900 text-white">
                      YYEVA (ألفا يمين)
                    </option>
                    <option value="vap" className="bg-slate-900 text-white">
                      Tencent VAP (ألفا يسار)
                    </option>
                    <option value="mp4" className="bg-slate-900 text-white">
                      MP4 قياسي عادي
                    </option>
                    <option value="webm" className="bg-slate-900 text-white">
                      WebM شفاف
                    </option>
                    <option value="gif" className="bg-slate-900 text-white">
                      GIF متحرك شفاف
                    </option>
                    <option value="png_seq" className="bg-slate-900 text-white">
                      سلسلة PNG (ZIP)
                    </option>
                  </select>
                </div>
              )}

              {/* Action Row */}
              <div className="flex items-center gap-2">
                {status === 'done' && resultUrl ? (
                  <>
                    {onPreviewResult && (
                      <button
                        type="button"
                        onClick={() => onPreviewResult(resultUrl, file.name, targetFormat)}
                        className="flex-1 py-2.5 px-3 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>معاينة النتيجة</span>
                      </button>
                    )}
                    {onDownloadResult && (
                      <button
                        type="button"
                        onClick={onDownloadResult}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل المحول</span>
                      </button>
                    )}
                  </>
                ) : (
                  onConvertSingle && (
                    <button
                      type="button"
                      onClick={() => onConvertSingle(id)}
                      disabled={status === 'processing' || isProcessingBatch}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-600/90 to-indigo-600/90 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>
                        {status === 'processing'
                          ? `جاري التحويل (${progress}%)...`
                          : `تحويل وتصدير هذا التأثير (${targetFormat.toUpperCase()})`}
                      </span>
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
