import React from 'react';
import { X, Car, Wrench, Fuel, Shield, Zap, Check, ArrowRight } from 'lucide-react';
import { VehicleConfig, VehicleType } from '../types/game';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Record<VehicleType, VehicleConfig>;
  currentVehicle: VehicleType;
  cash: number;
  onSelectVehicle: (type: VehicleType) => void;
  onBuyVehicle: (type: VehicleType) => void;
  onUpgradeVehicle: (type: VehicleType, stat: 'engine' | 'handling' | 'armor') => void;
  onChangeColor: (type: VehicleType, color: string) => void;
  onRefuelVehicle: () => void;
  onRepairVehicle: () => void;
}

const AVAILABLE_COLORS = [
  { nameAr: 'أصفر تاكسي إسكندرية', hex: '#f59e0b' },
  { nameAr: 'أزرق بحري', hex: '#0284c7' },
  { nameAr: 'أحمر ناري', hex: '#dc2626' },
  { nameAr: 'أسود ملكي', hex: '#0f172a' },
  { nameAr: 'أبيض لؤلؤي', hex: '#f8fafc' },
  { nameAr: 'ذهبي رمال ستانلي', hex: '#eab308' },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  currentVehicle,
  cash,
  onSelectVehicle,
  onBuyVehicle,
  onUpgradeVehicle,
  onChangeColor,
  onRefuelVehicle,
  onRepairVehicle,
}) => {
  if (!isOpen) return null;

  const currentCfg = vehicles[currentVehicle];
  const vehicleList: VehicleType[] = ['taxi', 'tuktuk', 'scooter'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl p-6 text-right overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">معرض وجراج إسكندرية</h2>
              <p className="text-xs text-slate-400">شراء وتعديل وتطوير سيارات التاكسي والتوك توك</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-2 px-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">رصيدك:</span>
              <span className="font-bold text-amber-400 text-lg">{cash.toLocaleString()} ج.م</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto pr-1 flex-1">
          {/* Vehicles Selector Column */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-300">اختر المركبة:</h3>
            {vehicleList.map(vType => {
              const v = vehicles[vType];
              const isSelected = currentVehicle === vType;
              return (
                <div
                  key={vType}
                  onClick={() => v.unlocked && onSelectVehicle(vType)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-400 shadow-lg'
                      : v.unlocked
                      ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                      : 'bg-slate-800/40 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">{v.nameAr}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-sky-500 text-white font-black px-2 py-0.5 rounded-full">
                        المركبة الحالية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{v.descriptionAr}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                    <span className="text-slate-400">السرعة القصوى: <strong className="text-sky-300">{v.maxSpeed} كم/س</strong></span>
                    {!v.unlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyVehicle(vType);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl transition shadow active:scale-95"
                      >
                        شراء ({v.price.toLocaleString()} ج.م)
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> جاهزة للقيادة
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Vehicle Stats & Upgrades */}
          <div className="md:col-span-2 flex flex-col gap-5 bg-slate-800/50 border border-slate-800 rounded-3xl p-5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">{currentCfg.nameAr}</h3>
                <span className="text-xs text-sky-400">{currentCfg.nameEn}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onRefuelVehicle}
                  className="flex items-center gap-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  <Fuel className="w-3.5 h-3.5" /> تفويل (40 ج.م)
                </button>
                <button
                  onClick={onRepairVehicle}
                  className="flex items-center gap-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  <Wrench className="w-3.5 h-3.5" /> صيانة (60 ج.م)
                </button>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>السرعة القصوى:</span>
                  <span className="font-bold text-sky-400">{currentCfg.maxSpeed} كم/س</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(currentCfg.maxSpeed / 160) * 100}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>قوة التسارع:</span>
                  <span className="font-bold text-amber-400">{currentCfg.acceleration} / 10</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${currentCfg.acceleration * 10}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>التحكم والمناورة:</span>
                  <span className="font-bold text-emerald-400">{currentCfg.handling} / 10</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${currentCfg.handling * 10}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>قوة الفرامل والتحمل:</span>
                  <span className="font-bold text-indigo-400">{currentCfg.braking} / 10</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${currentCfg.braking * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Upgrades Workshop */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> ورشة التعديل والتزويد:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Engine Upgrade */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-slate-200">تعديل المحرك (مرحلة {currentCfg.engineLevel})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">زيادة السرعة والتسارع 15%</p>
                  </div>
                  <button
                    onClick={() => onUpgradeVehicle(currentVehicle, 'engine')}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-1.5 rounded-xl transition"
                  >
                    ترقية (350 ج.م)
                  </button>
                </div>

                {/* Handling Upgrade */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-slate-200">عفشة وفرامل رياضية (مرحلة {currentCfg.handlingLevel})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">ثبات عالي على المنعطفات</p>
                  </div>
                  <button
                    onClick={() => onUpgradeVehicle(currentVehicle, 'handling')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 rounded-xl transition"
                  >
                    ترقية (280 ج.م)
                  </button>
                </div>

                {/* Armor Upgrade */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs text-slate-200">دعامية وشاسيه مصفح (مرحلة {currentCfg.armorLevel})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">تقليل أضرار الحوادث بنسبة 30%</p>
                  </div>
                  <button
                    onClick={() => onUpgradeVehicle(currentVehicle, 'armor')}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 rounded-xl transition"
                  >
                    ترقية (300 ج.م)
                  </button>
                </div>
              </div>
            </div>

            {/* Paint Shop */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <h4 className="text-sm font-bold text-slate-300">دوكو ودهان المركبة:</h4>
              <div className="flex flex-wrap items-center gap-2">
                {AVAILABLE_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => onChangeColor(currentVehicle, c.hex)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      currentCfg.primaryColor === c.hex
                        ? 'border-white bg-slate-700 text-white ring-2 ring-sky-400'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: c.hex }} />
                    <span>{c.nameAr}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm px-6 py-2.5 rounded-2xl shadow-xl transition active:scale-95"
          >
            <span>انطلق للشارع الآن</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
