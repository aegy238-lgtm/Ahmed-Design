import React from 'react';
import { Play, RotateCcw, Car, Navigation, Settings, Home, X } from 'lucide-react';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onResetCar: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onResetCar,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
  onMainMenu,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-1 border-b border-slate-800 pb-3">
          <span className="text-3xl">⏸</span>
          <h2 className="text-2xl font-black text-white">إيقاف مؤقت</h2>
          <p className="text-xs text-slate-400">حواري إسكندرية – Alex Life Simulator</p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm py-3 rounded-2xl shadow-lg transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>متابعة القيادة</span>
          </button>

          <button
            onClick={onResetCar}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-2xl border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة ضبط السيارة على الكورنيش</span>
          </button>

          <button
            onClick={onOpenMissions}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-2xl border border-slate-700 transition"
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>قائمة المهام والطلبات</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-2xl border border-slate-700 transition"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>الجراج وتعديل المركبات</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-2xl border border-slate-700 transition"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>الإعدادات والجرافيك والتحكم</span>
          </button>

          <button
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 bg-red-950/40 hover:bg-red-950/70 text-red-300 font-bold text-xs py-2.5 rounded-2xl border border-red-800/40 transition mt-2"
          >
            <Home className="w-4 h-4" />
            <span>العودة للشاشة الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
