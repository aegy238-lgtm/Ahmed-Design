import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyFileExtension,
  getFormatBadgeMeta,
  getGridColumnClasses,
  computeDualChannelRects,
  extractBalancedJsonSubstring,
  parseVapJsonFromText,
  computeDeterministicFrameTiming,
  computeSafeSeekTime,
  computeHardwareFriendlyDimensions,
} from './multiFormatShowcaseHelpers';

test('classifyFileExtension identifies SVGA, YYEVA, VAP, WebM, GIF, ZIP, and MP4 accurately', () => {
  assert.equal(classifyFileExtension('royal_dragon.svga'), 'svga');
  assert.equal(classifyFileExtension('king_throne_YYEVA.mp4'), 'yyeva');
  assert.equal(classifyFileExtension('vip_lion_VAP.mp4'), 'vap');
  assert.equal(classifyFileExtension('magic_portal.webm'), 'webm');
  assert.equal(classifyFileExtension('sparkle_crown.gif'), 'gif');
  assert.equal(classifyFileExtension('frames_Sequence.zip'), 'png_seq');
  assert.equal(classifyFileExtension('standard_video.mp4'), 'mp4');
});

test('getGridColumnClasses defaults to 3 side-by-side columns on desktop and tablet', () => {
  assert.equal(getGridColumnClasses(3), 'grid-cols-1 md:grid-cols-3');
  assert.equal(getGridColumnClasses(2), 'grid-cols-1 md:grid-cols-2');
  assert.equal(getGridColumnClasses(4), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
});

test('extractBalancedJsonSubstring and parseVapJsonFromText ignore trailing MP4 binary braces', () => {
  const rawBinaryWithVapc =
    'xxxxvapc{"info":{"v":2,"f":240,"w":752,"h":1632,"fps":24,"videoW":1136,"videoH":1632,"aFrame":[756,0,376,816],"rgbFrame":[0,0,752,1632]}}BINARY_GARBAGE_WITH_BRACE_}_HERE';
  const balanced = extractBalancedJsonSubstring(rawBinaryWithVapc, rawBinaryWithVapc.indexOf('{'));
  assert.ok(balanced);
  assert.equal(balanced.endsWith('}}'), true);

  const parsed = parseVapJsonFromText(rawBinaryWithVapc);
  assert.ok(parsed);
  assert.deepEqual(parsed.rgbFrame, [0, 0, 752, 1632]);
  assert.deepEqual(parsed.aFrame, [756, 0, 376, 816]);
});

test('computeDualChannelRects computes exact left/right alpha split and half-scale alpha for 1136x1632', () => {
  const yyeva = computeDualChannelRects(1500, 750, 'yyeva');
  assert.deepEqual(yyeva.rgbFrame, [0, 0, 750, 750]);
  assert.deepEqual(yyeva.aFrame, [750, 0, 750, 750]);
  assert.equal(yyeva.renderWidth, 750);
  assert.equal(yyeva.renderHeight, 750);

  const vap = computeDualChannelRects(1500, 750, 'vap');
  assert.deepEqual(vap.rgbFrame, [750, 0, 750, 750]);
  assert.deepEqual(vap.aFrame, [0, 0, 750, 750]);
  assert.equal(vap.renderWidth, 750);
  assert.equal(vap.renderHeight, 750);

  // Portrait 1136x1632 half-scale alpha layout (752x1632 RGB on left, 376x816 Alpha on top-right)
  const halfScaleAuto = computeDualChannelRects(1136, 1632, 'yyeva');
  assert.equal(halfScaleAuto.renderWidth, 752);
  assert.equal(halfScaleAuto.renderHeight, 1632);
  assert.equal(halfScaleAuto.aFrame[2], 376);
  assert.equal(halfScaleAuto.aFrame[3], 816);

  // Explicit vapc metadata overrides with exact pixel coordinates
  const withVapc = computeDualChannelRects(1136, 1632, 'yyeva', {
    videoW: 1136,
    videoH: 1632,
    rgbFrame: [0, 0, 752, 1632],
    aFrame: [756, 0, 376, 816],
  });
  assert.deepEqual(withVapc.rgbFrame, [0, 0, 752, 1632]);
  assert.deepEqual(withVapc.aFrame, [756, 0, 376, 816]);
  assert.equal(withVapc.renderWidth, 752);
  assert.equal(withVapc.renderHeight, 1632);
});

test('getFormatBadgeMeta returns rich Arabic badge info for all supported formats', () => {
  const svgaMeta = getFormatBadgeMeta('svga');
  assert.equal(svgaMeta.shortLabel, 'SVGA');
  assert.equal(svgaMeta.isAlphaCapable, true);

  const yyevaMeta = getFormatBadgeMeta('yyeva');
  assert.equal(yyevaMeta.isDualChannel, true);
});

test('permanent watermark name pinning persists and never deletes pinned names across sessions', async () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
  };

  const {
    savePermanentWatermarkText,
    getPermanentWatermarkText,
    isWatermarkNamePinned,
    getSavedWatermarkPresets,
    loadSavedBatchWatermarkConfig,
    saveBatchWatermarkConfig,
  } = await import('./watermarkAndBackground');

  // Pin a brand name permanently
  savePermanentWatermarkText('52gifts.cn', true);
  assert.equal(getPermanentWatermarkText(), '52gifts.cn');
  assert.equal(isWatermarkNamePinned(), true);
  assert.equal(getSavedWatermarkPresets().includes('52gifts.cn'), true);

  // Save batch config with gift_store_dashed style
  const cfg = loadSavedBatchWatermarkConfig();
  assert.equal(cfg.text, '52gifts.cn');
  assert.equal(cfg.style, 'gift_store_dashed');

  // Even if someone passes empty text to saveBatchWatermarkConfig, the permanently pinned name is preserved
  saveBatchWatermarkConfig({
    ...cfg,
    enabled: true,
    text: '',
    style: 'gift_store_dashed',
  });
  const reloaded = loadSavedBatchWatermarkConfig();
  assert.equal(reloaded.text, '52gifts.cn');
  assert.equal(reloaded.enabled, true);
  assert.equal(reloaded.style, 'gift_store_dashed');
});

test('computeDeterministicFrameTiming produces strictly monotonic microsecond timestamps and durations', () => {
  let prevEndUs = 0;
  for (let i = 0; i < 60; i++) {
    const t = computeDeterministicFrameTiming(i, 30);
    assert.equal(t.timestampUs, prevEndUs);
    assert.ok(t.durationUs >= 33333 && t.durationUs <= 33334);
    prevEndUs = t.timestampUs + t.durationUs;
  }
  assert.equal(prevEndUs, 2_000_000);
});

test('computeSafeSeekTime lands safely inside each frame presentation interval without boundary truncation', () => {
  const fps = 30;
  for (let i = 0; i < 30; i++) {
    const seekSec = computeSafeSeekTime(i, fps, 1.0);
    const frameFloor = Math.floor(seekSec * fps + 1e-9);
    assert.equal(frameFloor, i);
  }
});

test('computeHardwareFriendlyDimensions caps dual-channel YYEVA/VAP dimensions within 1920 and aligns to multiples of 4', () => {
  // 1334x750 SVGA exported as dual-channel YYEVA (2x width would be 2668 -> capped within 1920)
  const dims = computeHardwareFriendlyDimensions(1334, 750, true, 1920);
  assert.ok(dims.exportWidth <= 1920);
  assert.equal(dims.exportWidth, dims.singleWidth * 2);
  assert.equal(dims.singleWidth % 4, 0);
  assert.equal(dims.singleHeight % 4, 0);

  // Standard 750x750 single channel MP4
  const singleDims = computeHardwareFriendlyDimensions(750, 750, false, 1920);
  assert.equal(singleDims.singleWidth, 748);
  assert.equal(singleDims.exportWidth, 748);
});
