import React from 'react';
import { X, Navigation, Clock, Award, Car, MapPin, ChevronLeft } from 'lucide-react';
import { Mission, VehicleType } from '../types/game';
import { ALEXANDRIA_MISSIONS } from '../game/missionSystem';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVehicle: VehicleType;
  onSelectMission: (mission: Mission) => void;
  activeMissionId?: string;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose,
  currentVehicle,
  onSelectMission,
  activeMissionId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl p-6 text-right overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">طلبات ومشاوير إسكندرية</h2>
              <p className="text-xs text-slate-400">اختر مشوار تاكسي أو دليفري واكسب فلوس وخبرة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missions List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
          {ALEXANDRIA_MISSIONS.map(m => {
            const isVehicleAllowed = !m.allowedVehicle || m.allowedVehicle === currentVehicle;
            const isRunning = activeMissionId === m.id;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition flex flex-col gap-3 ${
                  isRunning
                    ? 'bg-sky-950/60 border-sky-400'
                    : isVehicleAllowed
                    ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-800/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{m.titleAr}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{m.descAr}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-black text-emerald-400 text-base">{m.reward} ج.م</span>
                    <span className="text-[11px] text-sky-400 font-bold">+{m.xpReward} XP</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>من: <strong>{m.startLocation.nameAr}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>إلى: <strong>{m.targetLocation.nameAr}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>الوقت: {m.timeLimitSeconds} ثانية</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      المركبة: {m.allowedVehicle === 'taxi' ? 'تاكسي' : m.allowedVehicle === 'tuktuk' ? 'توك توك' : m.allowedVehicle === 'scooter' ? 'سكوتر' : 'أي مركبة'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {m.passengerName && (
                    <span className="text-xs text-amber-200/90 font-medium">
                      الزبون: <strong>{m.passengerName}</strong>
                    </span>
                  )}

                  <button
                    disabled={!isVehicleAllowed || isRunning}
                    onClick={() => {
                      onSelectMission(m);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition shadow active:scale-95 mr-auto ${
                      isRunning
                        ? 'bg-sky-500 text-white cursor-default'
                        : isVehicleAllowed
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isRunning ? (
                      <span>قيد التنفيذ حالياً</span>
                    ) : isVehicleAllowed ? (
                      <>
                        <span>قبول المشوار</span>
                        <ChevronLeft className="w-4 h-4" />
                      </>
                    ) : (
                      <span>مركبة غير مناسبة</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
