import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Upload,
  RotateCcw,
  Save,
  Check,
  Download,
  Monitor,
  FolderOpen,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  WifiOff,
  KeyRound,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings, WindowsInstallerConfig } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface WindowsInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  settings: AppSettings | null;
}

const STORAGE_KEY = 'svga_windows_installer_config_v1';
const REQUIRED_PASSCODE_NORMALIZED = '150150150';

const DEFAULT_CONFIG: WindowsInstallerConfig = {
  brandTitle: 'Ahmed Pro SVGA',
  desktopAppName: 'MotionTools',
  description: 'تطبيق ويندوز لمعالجة وتحويل ملفات الحركة',
  version: '1.0.24',
  installPath: 'C:\\Users\\EL.DAWLIA\\AppData\\Local\\Programs\\MotionTools',
  createDesktopShortcut: true,
  launchAfterInstall: true,
  logoDataUrl: '',
};

function sanitizeFolderName(name: string): string {
  const clean = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return clean || 'MotionTools';
}

function updateInstallPathAppName(currentPath: string, nextAppName: string): string {
  const folder = sanitizeFolderName(nextAppName);
  const parts = currentPath.split('\\');
  if (parts.length >= 2) {
    parts[parts.length - 1] = folder;
    return parts.join('\\');
  }
  return `C:\\Users\\User\\AppData\\Local\\Programs\\${folder}`;
}

/**
 * Resize any uploaded image file (PNG/JPG/WebP/SVG) onto a 256x256 transparent PNG data URL
 * so it embeds cleanly inside the Windows WPF installer and converts cleanly to a .ico file.
 */
async function convertImageFileToPng256(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.clearRect(0, 0, size, size);
        // Fit image preserving aspect ratio centered inside 256x256
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const WindowsInstallerModal: React.FC<WindowsInstallerModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  settings,
}) => {
  // Security Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [verifiedPasscode, setVerifiedPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  // Installer Config State
  const [config, setConfig] = useState<WindowsInstallerConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_CONFIG;
  });

  // UI & Build State
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState('');
  const [buildError, setBuildError] = useState('');
  const [buildDoneFile, setBuildDoneFile] = useState('');
  const [logoUploadError, setLogoUploadError] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const passcodeInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, install: triggerPwaInstall } = usePWAInstall();

  // Sync saved Firestore config when settings load
  useEffect(() => {
    if (settings?.windowsInstallerConfig) {
      setConfig((prev) => ({
        ...DEFAULT_CONFIG,
        ...prev,
        ...settings.windowsInstallerConfig,
      }));
    }
  }, [settings?.windowsInstallerConfig]);

  // Reset password gate error & focus when modal opens
  useEffect(() => {
    if (isOpen && !isUnlocked) {
      setPasscodeError('');
      setTimeout(() => passcodeInputRef.current?.focus(), 100);
    }
  }, [isOpen, isUnlocked]);

  // Strictly never render for non-admins
  if (!isAdmin || !isOpen) return null;

  const activeLogoSrc = config.logoDataUrl || settings?.logoUrl || '/logo.png';

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    const normalized = passcodeInput.replace(/\s+/g, '').trim();
    if (!normalized) {
      setPasscodeError('يرجى إدخال كلمة السر أولاً');
      return;
    }

    setIsVerifyingPasscode(true);
    try {
      const res = await fetch('/api/windows-installer/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });

      if (res.ok) {
        setVerifiedPasscode(normalized);
        setIsUnlocked(true);
        setPasscodeInput('');
      } else {
        const data = await res.json().catch(() => ({}));
        setPasscodeError(data?.message || 'كلمة السر غير صحيحة');
      }
    } catch {
      // Offline fallback validation
      if (normalized === REQUIRED_PASSCODE_NORMALIZED) {
        setVerifiedPasscode(normalized);
        setIsUnlocked(true);
        setPasscodeInput('');
      } else {
        setPasscodeError('كلمة السر غير صحيحة');
      }
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const handleDesktopAppNameChange = (nextName: string) => {
    setConfig((prev) => ({
      ...prev,
      desktopAppName: nextName,
      installPath: updateInstallPathAppName(prev.installPath, nextName),
    }));
    setSaveSuccess(false);
  };

  const handleLogoFileSelected = async (file: File) => {
    setLogoUploadError('');
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, SVG)');
      return;
    }
    try {
      const pngDataUrl = await convertImageFileToPng256(file);
      setConfig((prev) => ({ ...prev, logoDataUrl: pngDataUrl }));
      setSaveSuccess(false);
    } catch (err: any) {
      setLogoUploadError(err?.message || 'تعذر معالجة صورة اللوجو');
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const payload: WindowsInstallerConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    try {
      await setDoc(
        doc(db, 'settings', 'global'),
        { windowsInstallerConfig: payload },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore save notice (saved locally):', err);
    } finally {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleBuildAndDownloadWindowsInstaller = async () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setBuildError('');
    setBuildDoneFile('');
    setBuildProgress(12);
    setBuildStatus('جاري التحقق من الإعدادات وتجهيز أيقونة الويندوز (.ico)...');

    // Save current config locally before building
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }));
    } catch {}

    const progressTimer = window.setInterval(() => {
      setBuildProgress((prev) => {
        if (prev >= 86) return prev;
        if (prev >= 55) {
          setBuildStatus('جاري تجميع ملفات النسخة الأوفلاين وبناء نافذة المثبّت...');
        } else if (prev >= 28) {
          setBuildStatus('جاري دمج السيرفر المحلي الأوفلاين واختصارات سطح المكتب...');
        }
        return prev + 4;
      });
    }, 350);

    try {
      const response = await fetch('/api/windows-installer/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: verifiedPasscode || REQUIRED_PASSCODE_NORMALIZED,
          brandTitle: config.brandTitle,
          desktopAppName: config.desktopAppName,
          description: config.description,
          version: config.version,
          installPath: config.installPath,
          createDesktopShortcut: config.createDesktopShortcut,
          launchAfterInstall: config.launchAfterInstall,
          logoDataUrl: config.logoDataUrl || undefined,
        }),
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'فشل بناء حزمة مثبّت الويندوز');
      }

      setBuildProgress(94);
      setBuildStatus('جاري تنزيل حزمة المثبّت إلى جهازك...');

      const blob = await response.blob();
      const safeName = sanitizeFolderName(config.desktopAppName);
      const safeVer = (config.version || '1.0.24').replace(/[<>:"/\\|?*]/g, '');
      const filename = `${safeName}-Setup-v${safeVer}-Win64.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setBuildProgress(100);
      setBuildStatus('تم تنزيل مثبّت الويندوز الأوفلاين بنجاح!');
      setBuildDoneFile(filename);
    } catch (err: any) {
      clearInterval(progressTimer);
      setBuildProgress(0);
      setBuildStatus('');
      setBuildError(err?.message || 'حدث خطأ أثناء تنزيل المثبّت');
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isBuilding) onClose();
        }}
      >
        {/* === LOCKED STATE: PASSWORD GATE (150 150 150) === */}
        {!isUnlocked ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            className="w-full max-w-md rounded-2xl bg-[#111018] border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden"
            dir="rtl"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#181724] border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">بوابة مثبّت الويندوز (للمدير فقط)</h3>
                  <p className="text-[11px] text-slate-400">مطلوب إدخال كلمة السر لفتح التنزيل والتخصيص</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Password Form */}
            <form onSubmit={handlePasscodeSubmit} className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-2 pb-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/25 via-indigo-600/20 to-amber-500/20 border border-purple-400/30 flex items-center justify-center shadow-lg">
                  <KeyRound className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                  أدخل كلمة السر الخاصة بحساب المدير للوصول إلى أداة بناء وتنزيل نسخة الويندوز الأوفلاين.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">كلمة السر</label>
                <div className="relative">
                  <input
                    ref={passcodeInputRef}
                    type={showPasscode ? 'text' : 'password'}
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      if (passcodeError) setPasscodeError('');
                    }}
                    placeholder="أدخل كلمة السر..."
                    className="w-full h-11 rounded-xl bg-[#0a0910] border border-white/15 focus:border-purple-500 px-4 pl-11 text-white text-sm font-mono tracking-widest outline-none transition-colors text-center"
                    dir="ltr"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passcodeError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/35 px-3 py-2.5 text-xs font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isVerifyingPasscode}
                  className="flex-1 h-11 rounded-xl bg-[#7C5CFF] hover:bg-[#6D4AFF] disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  {isVerifyingPasscode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                  <span>فتح المثبّت</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* === UNLOCKED STATE: WINDOWS INSTALLER STUDIO + LIVE REPLICA WINDOW === */
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-6xl rounded-2xl bg-[#0c0b13] border border-white/15 shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden my-auto"
            dir="rtl"
          >
            {/* Studio Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#151421] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-white">
                      استوديو مثبّت تطبيق الويندوز الأوفلاين
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black flex items-center gap-1">
                      <WifiOff className="w-3 h-3" />
                      يعمل أوفلاين
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    خصّص الاسم واللوجو ورقم الإصدار ثم نزّل مثبّت ويندوز حقيقي بواجهة التثبيت الاحترافية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    onClick={() => triggerPwaInstall()}
                    className="h-8 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="تثبيت فوري كتطبيق ويب أوفلاين (PWA) على هذا الجهاز"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تثبيت PWA فوري</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsUnlocked(false);
                    setVerifiedPasscode('');
                  }}
                  className="h-8 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="إعادة قفل النافذة بكلمة السر"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">قفل</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBuilding}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body Grid: Customizer Panel (Right in RTL) + Exact Windows Installer Window Preview (Left in RTL) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 max-h-[82vh] overflow-y-auto">
              {/* === CUSTOMIZATION PANEL (5 cols) === */}
              <div className="lg:col-span-5 space-y-4 bg-[#141320] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    تخصيص الهوية والإصدار واللوجو
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      saveSuccess
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/40 text-purple-200'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{saveSuccess ? 'تم الحفظ' : 'حفظ الإعدادات'}</span>
                  </button>
                </div>

                {/* Upload Custom Logo */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    لوجو التطبيق وأيقونة سطح المكتب (.PNG / .ICO)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[#07070c] border border-white/15 flex items-center justify-center overflow-hidden shrink-0 p-1">
                      <img
                        src={activeLogoSrc}
                        alt="App Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFileSelected(file);
                          e.target.value = '';
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="h-9 px-3.5 rounded-lg bg-[#7C5CFF]/20 hover:bg-[#7C5CFF]/30 border border-[#7C5CFF]/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع لوجو مخصص</span>
                        </button>
                        {config.logoDataUrl && (
                          <button
                            type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, logoDataUrl: '' }))}
                            className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="استعادة اللوجو الافتراضي"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>افتراضي</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        يتم تحويل اللوجو تلقائياً إلى أيقونة ويندوز (.ico) عالية الدقة لسطح المكتب
                      </p>
                    </div>
                  </div>
                  {logoUploadError && (
                    <p className="text-[11px] text-rose-400 font-bold">{logoUploadError}</p>
                  )}
                </div>

                {/* Brand Title (Golden Top Line) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    اسم العلامة التجارية (العنوان الذهبي)
                  </label>
                  <input
                    type="text"
                    value={config.brandTitle}
                    onChange={(e) => setConfig((prev) => ({ ...prev, brandTitle: e.target.value }))}
                    placeholder="Ahmed Pro SVGA"
                    className="w-full h-10 rounded-lg bg-[#0b0a12] border border-white/15 focus:border-amber-400 px-3 text-sm text-amber-300 font-bold outline-none transition-colors"
                    dir="ltr"
                  />
                </div>

                {/* Desktop App / Site Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    اسم الموقع / التطبيق على سطح المكتب
                  </label>
                  <input
                    type="text"
                    value={config.desktopAppName}
                    onChange={(e) => handleDesktopAppNameChange(e.target.value)}
                    placeholder="MotionTools"
                    className="w-full h-10 rounded-lg bg-[#0b0a12] border border-white/15 focus:border-purple-400 px-3 text-sm text-white font-bold outline-none transition-colors"
                    dir="ltr"
                  />
                </div>

                {/* Version Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    رقم الإصدار (Version)
                  </label>
                  <input
                    type="text"
                    value={config.version}
                    onChange={(e) => setConfig((prev) => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.24"
                    className="w-full h-10 rounded-lg bg-[#0b0a12] border border-white/15 focus:border-purple-400 px-3 text-sm text-white font-mono outline-none transition-colors"
                    dir="ltr"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    وصف التطبيق أسفل الاسم
                  </label>
                  <input
                    type="text"
                    value={config.description}
                    onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="تطبيق ويندوز لمعالجة وتحويل ملفات الحركة"
                    className="w-full h-10 rounded-lg bg-[#0b0a12] border border-white/15 focus:border-purple-400 px-3 text-xs text-slate-200 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* === EXACT WINDOWS INSTALLER WINDOW PREVIEW & DOWNLOAD (7 cols) === */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                {/* Native-Style Windows Installer Window Frame */}
                <div
                  className="rounded-xl overflow-hidden border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85)] bg-[#111018]"
                  dir="ltr"
                >
                  {/* Native Windows Light Title Bar */}
                  <div className="h-9 bg-[#f3f3f6] text-[#1f2937] px-3 flex items-center justify-between border-b border-black/10 select-none">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isBuilding}
                      className="w-7 h-7 rounded hover:bg-black/10 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                      aria-label="Close window"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
                      <span className="truncate" dir="rtl">
                        تثبيت التطبيق — {config.brandTitle || 'Ahmed Pro SVGA'} · {config.desktopAppName || 'MotionTools'}
                      </span>
                      <img
                        src={activeLogoSrc}
                        alt=""
                        className="w-4 h-4 rounded-sm object-contain shrink-0"
                      />
                    </div>
                  </div>

                  {/* Dark Installer Body (Exact Match to Screenshot) */}
                  <div className="p-6 sm:p-7 space-y-6 bg-[#111018] text-white">
                    {/* Header: Left Titles + Right Logo */}
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex-1 min-w-0 space-y-1.5 text-left">
                        <div className="text-2xl sm:text-[28px] font-black tracking-tight text-[#FBBF24] leading-tight truncate">
                          {config.brandTitle || 'Ahmed Pro SVGA'}
                        </div>
                        <div className="text-3xl sm:text-[36px] font-black tracking-tight text-white leading-tight truncate">
                          {config.desktopAppName || 'MotionTools'}
                        </div>
                        <div
                          className="text-sm sm:text-[15px] text-slate-300 pt-1 leading-relaxed"
                          dir="rtl"
                          style={{ textAlign: 'left' }}
                        >
                          {config.description || 'تطبيق ويندوز لمعالجة وتحويل ملفات الحركة'}
                        </div>
                      </div>

                      {/* Square/Circular Logo Box on Right */}
                      <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-lg bg-[#050509] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-xl p-1.5">
                        <img
                          src={activeLogoSrc}
                          alt={config.desktopAppName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Install Folder Field */}
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm font-medium text-slate-300 text-left">
                        مجلد التثبيت
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          ref={pathInputRef}
                          type="text"
                          value={config.installPath}
                          readOnly={!isEditingPath}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, installPath: e.target.value }))
                          }
                          onBlur={() => setIsEditingPath(false)}
                          className={`flex-1 h-9 px-3 rounded-[2px] bg-white text-[#111827] text-xs sm:text-sm font-normal outline-none border ${
                            isEditingPath ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-slate-300'
                          }`}
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPath(true);
                            setTimeout(() => pathInputRef.current?.focus(), 30);
                          }}
                          className="h-9 px-5 rounded-[3px] bg-[#161522] hover:bg-[#232234] border border-white/80 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <span>تغيير</span>
                        </button>
                      </div>
                    </div>

                    {/* Checkboxes (Desktop Shortcut + Launch After Install) */}
                    <div className="space-y-3 pt-1">
                      <label className="flex items-center justify-between max-w-xs cursor-pointer select-none">
                        <span className="text-xs sm:text-sm text-slate-200">
                          إضافة اختصار على سطح المكتب
                        </span>
                        <input
                          type="checkbox"
                          checked={config.createDesktopShortcut}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              createDesktopShortcut: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between max-w-xs cursor-pointer select-none">
                        <span className="text-xs sm:text-sm text-slate-200">
                          تشغيل التطبيق بعد التثبيت
                        </span>
                        <input
                          type="checkbox"
                          checked={config.launchAfterInstall}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              launchAfterInstall: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full h-5 bg-[#e5e5e8] border border-slate-400/60 overflow-hidden rounded-[2px]">
                        <div
                          className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#9b7bff] transition-all duration-300"
                          style={{ width: `${buildProgress}%` }}
                        />
                      </div>
                      {buildStatus && (
                        <div className="text-xs text-purple-300 font-bold text-right" dir="rtl">
                          {buildStatus} ({buildProgress}%)
                        </div>
                      )}
                      <div className="text-xs sm:text-sm text-slate-400 pt-1 font-normal text-left">
                        Windows x64 &nbsp;•&nbsp; {config.version || '1.0.24'} الإصدار
                      </div>
                    </div>

                    {/* Footer Buttons: Left Primary Purple "تثبيت التطبيق" + Right Outlined "إغلاق" */}
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <button
                        type="button"
                        onClick={handleBuildAndDownloadWindowsInstaller}
                        disabled={isBuilding}
                        className="min-w-[190px] sm:min-w-[215px] h-11 px-6 rounded-[3px] bg-[#7C5CFF] hover:bg-[#6d4cff] active:scale-[0.99] disabled:opacity-70 text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-700/30 transition-all cursor-pointer"
                      >
                        {isBuilding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري تجهيز المثبّت...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>تثبيت التطبيق</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isBuilding}
                        className="min-w-[110px] sm:min-w-[125px] h-11 px-6 rounded-[3px] bg-[#161522] hover:bg-[#242336] border border-white/80 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error or Success Instructions Banner */}
                {buildError && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 px-4 py-3 text-xs font-bold text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{buildError}</span>
                  </div>
                )}

                {buildDoneFile ? (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-black text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>تم تنزيل الحزمة: {buildDoneFile}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      فك الضغط عن الملف ثم افتح{' '}
                      <span className="font-mono text-amber-300 bg-black/40 px-1.5 py-0.5 rounded">
                        Setup-{sanitizeFolderName(config.desktopAppName)}.bat
                      </span>{' '}
                      لتظهر نافذة التثبيت الرسمية على ويندوز ويتم تثبيت التطبيق على سطح المكتب باللوجو المخصص ويعمل أوفلاين بدون إنترنت.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-start gap-2.5 text-[11px] text-slate-300">
                    <FolderOpen className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      عند الضغط على <strong className="text-white">«تثبيت التطبيق»</strong> يتم بناء حزمة تثبيت ويندوز كاملة تحتوي على{' '}
                      <strong className="text-purple-300">واجهة المثبّت الرسومية (Windows x64)</strong> +{' '}
                      <strong className="text-amber-300">أيقونة سطح المكتب (.ico)</strong> +{' '}
                      <strong className="text-emerald-300">محرك التشغيل الأوفلاين المحلي</strong> بدون الحاجة لأي برامج إضافية أو إنترنت.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
