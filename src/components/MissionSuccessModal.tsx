import React, { useEffect } from 'react';
import { Award, Star, CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionTitle: string;
  cashEarned: number;
  tipEarned: number;
  xpEarned: number;
  rating: number;
}

const ALEXANDRIAN_REVIEWS = [
  'تسلم إيدك يا أسطى، سواقة معلمية ع الكورنيش ومفيش ولا خبطة!',
  'الله ينور عليك يا باشا، أحلى تاكسي في إسكندرية كلها!',
  'وصلتني في ميعادي بالظبط، ده كرم إسكندراني أصيل!',
  'سواقة رايقة والتوك توك طيارة في الحارة.. خمس نجوم تستاهل!',
];

export const MissionSuccessModal: React.FC<MissionSuccessModalProps> = ({
  isOpen,
  onClose,
  missionTitle,
  cashEarned,
  tipEarned,
  xpEarned,
  rating,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#0284c7', '#f59e0b', '#10b981', '#ffffff'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const reviewText = ALEXANDRIAN_REVIEWS[Math.floor(Math.random() * ALEXANDRIAN_REVIEWS.length)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">تم إنجاز المشوار بنجاح!</span>
          <h2 className="text-xl font-black text-white">{missionTitle}</h2>
        </div>

        {/* 5-star rating */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              className={`w-6 h-6 ${
                star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-700 text-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Passenger Review Quote */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-xs text-amber-200/90 italic">
          💬 "{reviewText}"
        </div>

        {/* Fare & Rewards Breakdown */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2.5 text-right">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>الأجرة الأساسية للمشوار:</span>
            <span className="font-bold font-mono text-slate-200">{cashEarned - tipEarned} ج.م</span>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>إكرامية القيادة السلسة (بقشيش):</span>
            <span className="font-bold font-mono">+{tipEarned} ج.م</span>
          </div>

          <div className="flex items-center justify-between text-xs text-sky-400">
            <span>نقاط الخبرة المكتسبة:</span>
            <span className="font-bold font-mono">+{xpEarned} XP</span>
          </div>

          <div className="border-t border-slate-700/80 pt-2 flex items-center justify-between text-sm font-black">
            <span className="text-white">إجمالي الأرباح:</span>
            <span className="text-emerald-400 text-lg font-mono">+{cashEarned} ج.م</span>
          </div>
        </div>

        {/* Collect button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm py-3 rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
        >
          <span>استلام الأجرة ومتابعة اللعب</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
