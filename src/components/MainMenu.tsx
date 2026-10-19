import React from 'react';
import { Play, Car, Settings, Sparkles } from 'lucide-react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  cash: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenGarage,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gradient-to-t from-slate-950 via-slate-900/90 to-sky-950/70 select-none overflow-y-auto">
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative max-w-xl w-full flex flex-col items-center text-center gap-6 my-auto">
        {/* Title & Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>لعبة قيادة وعالم مفتوح ثلاثية الأبعاد 3D</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-300 to-white drop-shadow-lg tracking-tight">
            حواري إسكندرية
          </h1>

          <span className="text-sm md:text-base font-bold text-sky-400 tracking-widest uppercase">
            Alex Life Simulator
          </span>

          <p className="text-xs md:text-sm text-slate-300 max-w-md leading-relaxed mt-1">
            عش أجواء عروس البحر المتوسط.. قُد التاكسي الأصفر والأسود والتوك توك الشعبي، وصّل الركاب واستمتع بجمال كورنيش ستانلي وبحري والأنفوشي!
          </p>
        </div>

        {/* Action Menu Buttons */}
        <div className="flex flex-col w-full max-w-sm gap-3">
          <button
            onClick={onStartGame}
            className="group w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all transform active:scale-95 flex items-center justify-center gap-3 border border-amber-300"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>انطلق في شوارع إسكندرية (بدء اللعب)</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="w-full bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-sm py-3 px-6 rounded-2xl shadow-lg border border-slate-700/80 transition flex items-center justify-center gap-2.5"
          >
            <Car className="w-4 h-4 text-sky-400" />
            <span>معرض وجراج المركبات (التاكسي والتوك توك)</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm py-3 px-6 rounded-2xl shadow-lg border border-slate-700/80 transition flex items-center justify-center gap-2.5"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>الإعدادات والجرافيك والتحكم</span>
          </button>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-2">
          <span className="text-[11px] bg-slate-900/70 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl">
            🚖 تاكسي إسكندراني أصيل
          </span>
          <span className="text-[11px] bg-slate-900/70 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl">
            🛺 توك توك شوارع بحري
          </span>
          <span className="text-[11px] bg-slate-900/70 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl">
            🌉 كوبري ستانلي وقلعة قايتباي
          </span>
          <span className="text-[11px] bg-slate-900/70 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl">
            🔊 أصوات محركات وكلاكس واقعية
          </span>
        </div>
      </div>
    </div>
  );
};
