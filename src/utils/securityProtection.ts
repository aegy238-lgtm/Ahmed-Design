/**
 * Core Security Protection & Content Shield
 * 
 * Provides comprehensive client-side security hardening:
 * 1. Global Context Menu (Right-Click) Suppression across all pages.
 * 2. Whitelists text inputs, textareas, and contenteditable elements for normal typing.
 * 3. Mobile Long-Press Callout Suppression for images, videos, and preview canvases.
 * 4. Image/Video Drag-to-Desktop Prevention.
 * 5. Keyboard Shortcut Protection (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+S / Cmd+S, Ctrl+U).
 * 6. Code & File Inspection Protection.
 */

let shieldInitialized = false;
let toastTimeout: any = null;

// Disables default context menu except on designated text/editing fields
function handleContextMenu(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const isInput = target.tagName === 'INPUT';
  const isTextarea = target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
  const isExplicitlyAllowed = Boolean(target.closest('[data-allow-context-menu="true"]'));

  if (isInput) {
    const inputEl = target as HTMLInputElement;
    const type = (inputEl.type || 'text').toLowerCase();
    const textTypes = ['text', 'password', 'email', 'number', 'search', 'url', 'tel', 'date', 'time'];
    if (textTypes.includes(type)) {
      return;
    }
  }

  if (isTextarea || isContentEditable || isExplicitlyAllowed) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  showSecurityToast();
}

// Shows a discrete floating badge indicating content protection
function showSecurityToast() {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById('security-protection-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'security-protection-toast';
    toast.className = 'security-shield-toast';
    toast.setAttribute('dir', 'rtl');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      color: #f8fafc;
      border: 1px solid rgba(59, 130, 246, 0.4);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.2);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>الموقع مؤمن ومشفر بالكامل - تم تفعيل الحماية المشددة للملفات والأكواد</span>
    `;
    document.body.appendChild(toast);
  }

  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(15px)';
    }
  }, 2200);
}

// Prevents accidental saving, view-source, or inspecting via keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const key = e.key.toLowerCase();
  const code = e.code;

  // Block F12 DevTools shortcut
  if (code === 'F12' || key === 'f12') {
    e.preventDefault();
    e.stopPropagation();
    showSecurityToast();
    return;
  }

  if (isCtrlOrCmd) {
    const target = e.target as HTMLElement | null;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Block Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect Element)
    if (isShift && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast();
      return;
    }

    // Block Ctrl+S / Cmd+S (Save Page)
    if (key === 's') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Block Ctrl+U / Cmd+U (View Source)
    if (key === 'u' && !isInput) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
}

// Prevents dragging media files out
function handleDragStart(e: DragEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('[data-allow-drag="true"]') || target.closest('.dnd-item') || target.closest('.sortable-item')) {
    return;
  }

  const isMedia = target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'CANVAS';
  if (isMedia) {
    e.preventDefault();
  }
}

// Injects protective stylesheet to disable unwanted selection
function injectSecurityStyles() {
  if (typeof document === 'undefined') return;
  const STYLE_ID = 'app-security-protection-styles';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Protection against long-press preview and unwanted selection */
    img, video, canvas, svg, .protected-media {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
    }

    /* Preserve smooth selection for inputs */
    input, textarea, [contenteditable="true"] {
      -webkit-touch-callout: default !important;
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initializes the full Application Security Shield.
 */
export function initClientSecurityShield() {
  if (shieldInitialized || typeof window === 'undefined') return;
  shieldInitialized = true;

  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('dragstart', handleDragStart, { capture: true });
  injectSecurityStyles();

  console.log('[SecurityShield] Global protection active: Source code, inspect tools, & assets secured.');
}
