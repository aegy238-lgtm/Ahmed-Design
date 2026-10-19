import React from 'react';
import { X, Settings, Sun, Moon, Sunset, Volume2, Sliders, Smartphone, Monitor } from 'lucide-react';
import { TimeOfDay, WeatherType } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  onChangeWeather: (w: WeatherType) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  timeOfDay,
  onChangeTimeOfDay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full shadow-2xl p-6 text-right overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">إعدادات اللعبة وفصل الأصوات</h2>
              <p className="text-xs text-slate-400">تخصيص الإضاءة، الجرافيك، والتحكم المنفصل للأغاني والمحرك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex flex-col gap-5 overflow-y-auto pr-1 flex-1">
          {/* Time of Day */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-sm font-bold text-slate-300">توقيت وإضاءة الإسكندرية:</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => onChangeTimeOfDay('day')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                  timeOfDay === 'day'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>النهار</span>
              </button>

              <button
                onClick={() => onChangeTimeOfDay('sunset')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                  timeOfDay === 'sunset'
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Sunset className="w-4 h-4 text-orange-400" />
                <span>غروب ستانلي</span>
              </button>

              <button
                onClick={() => onChangeTimeOfDay('night')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                  timeOfDay === 'night'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>ليل الكورنيش</span>
              </button>
            </div>
          </div>

          {/* Independent Audio Channels Control */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>فصل الصوت (صوت المحرك لوحده والأغاني لوحدها):</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              {/* Engine Volume */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 w-32 shrink-0">
                  <span>🚗</span> صوت المحرك:
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.6"
                  onChange={(e) => soundManager.setEngineVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => soundManager.toggleEngineMute()}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-1 rounded-lg border border-slate-700 shrink-0"
                >
                  كتم/تشغيل
                </button>
              </div>

              {/* Radio Music Volume */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="font-bold text-sky-400 flex items-center gap-1.5 w-32 shrink-0">
                  <span>📻</span> أغاني الراديو:
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.85"
                  onChange={(e) => soundManager.setRadioVolume(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => soundManager.toggleRadioMute()}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold px-3 py-1 rounded-lg border border-slate-700 shrink-0"
                >
                  كتم/تشغيل
                </button>
              </div>
            </div>
          </div>

          {/* Controls Reference */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>طريقة التحكم على جميع الأجهزة:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" /> كمبيوتر ولاب توب (Windows / Mac)
                </span>
                <span>• تسارع وبنزين: <strong>W</strong> أو <strong>السهم لأعلى</strong></span>
                <span>• فرامل ورجوع: <strong>S</strong> أو <strong>السهم لأسفل</strong></span>
                <span>• التوجيه: <strong>A / D</strong> أو <strong>الأسهم يمين/يسار</strong></span>
                <span>• فرامل يد ودريفت: <strong>مسافة (Space)</strong></span>
                <span>• بوق وكلاكس التاكسي: <strong>H</strong></span>
                <span>• تبديل الكاميرا: <strong>C</strong> | راديو: <strong>R</strong></span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> هواتف Android و iPhone
                </span>
                <span>• أزرار لمس مخصصة بالكامل على الشاشة</span>
                <span>• دواسة بنزين خضراء ودواسة فرامل حمراء</span>
                <span>• أزرار انعطاف يسار ويمين كبيرة وسلسة</span>
                <span>• زر دريفت وفرامل يد يدعم الانجرافات</span>
                <span>• زر بوق وكلاكس إسكندراني سريع</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
