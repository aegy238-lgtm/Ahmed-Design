import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  Radio,
  SkipForward,
  SkipBack,
  Pause,
  Fuel,
  Wrench,
  Navigation,
  Car,
  AlertTriangle,
  Disc,
} from 'lucide-react';
import { VehiclePhysicsState, VehicleControlInput } from '../game/physics';
import { Mission } from '../types/game';
import { soundManager, RADIO_STATIONS, RadioStation } from '../audio/soundManager';

interface HUDProps {
  physicsState: VehiclePhysicsState;
  mission: Mission | null;
  missionStage: 'inactive' | 'pickup' | 'in_transit' | 'completed';
  missionTimeRemaining: number;
  cash: number;
  xp: number;
  level: number;
  cameraMode: string;
  onSwitchCamera: () => void;
  onOpenPause: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onControlInput: (input: Partial<VehicleControlInput>) => void;
  onRefuel: () => void;
  onRepair: () => void;
  nearGasStation: boolean;
  nearWorkshop: boolean;
  meterFare?: number;
  tripDistanceMeters?: number;
}

export const HUD: React.FC<HUDProps> = ({
  physicsState,
  mission,
  missionStage,
  missionTimeRemaining,
  cash,
  xp,
  level,
  cameraMode,
  onSwitchCamera,
  onOpenPause,
  onOpenGarage,
  onOpenMissions,
  onControlInput,
  onRefuel,
  onRepair,
  nearGasStation,
  nearWorkshop,
  meterFare = 15,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [isEngineMuted, setIsEngineMuted] = useState(soundManager.isEngineMuted);
  const [isRadioMuted, setIsRadioMuted] = useState(soundManager.isRadioMuted);
  const [radioActive, setRadioActive] = useState(soundManager.isRadioOn);
  const [currentStation, setCurrentStation] = useState<RadioStation>(
    RADIO_STATIONS[soundManager.currentStationIndex] || RADIO_STATIONS[0]
  );

  const [touchThrottle, setTouchThrottle] = useState(false);
  const [touchReverse, setTouchReverse] = useState(false);
  const [touchLeft, setTouchLeft] = useState(false);
  const [touchRight, setTouchRight] = useState(false);
  const [touchHandbrake, setTouchHandbrake] = useState(false);

  const handleHorn = () => {
    soundManager.playHorn();
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleEngineMute = () => {
    const engMuted = soundManager.toggleEngineMute();
    setIsEngineMuted(engMuted);
  };

  const handleToggleRadioMute = () => {
    const radMuted = soundManager.toggleRadioMute();
    setIsRadioMuted(radMuted);
  };

  const handleToggleRadio = () => {
    const active = soundManager.toggleRadio();
    setRadioActive(active);
  };

  const handleNextStation = () => {
    const nextSt = soundManager.nextStation();
    setCurrentStation(nextSt);
    setRadioActive(true);
  };

  const handlePrevStation = () => {
    const prevSt = soundManager.prevStation();
    setCurrentStation(prevSt);
    setRadioActive(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          onControlInput({ throttle: true });
          break;
        case 'KeyS':
        case 'ArrowDown':
          onControlInput({ reverse: true });
          break;
        case 'KeyA':
        case 'ArrowLeft':
          onControlInput({ steerLeft: true });
          break;
        case 'KeyD':
        case 'ArrowRight':
          onControlInput({ steerRight: true });
          break;
        case 'Space':
          onControlInput({ handbrake: true });
          break;
        case 'KeyH':
          handleHorn();
          break;
        case 'KeyC':
          onSwitchCamera();
          break;
        case 'KeyR':
          handleToggleRadio();
          break;
        case 'Escape':
          onOpenPause();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          onControlInput({ throttle: false });
          break;
        case 'KeyS':
        case 'ArrowDown':
          onControlInput({ reverse: false });
          break;
        case 'KeyA':
        case 'ArrowLeft':
          onControlInput({ steerLeft: false });
          break;
        case 'KeyD':
        case 'ArrowRight':
          onControlInput({ steerRight: false });
          break;
        case 'Space':
          onControlInput({ handbrake: false });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onControlInput, onSwitchCamera, onOpenPause]);

  // Map coordinates
  const mapPlayerX = 50 + (physicsState.position.x / 180) * 35;
  const mapPlayerY = 50 + (physicsState.position.z / 360) * 45;

  let missionTargetDist = 0;
  if (mission) {
    const target = missionStage === 'pickup' ? mission.startLocation : mission.targetLocation;
    missionTargetDist = Math.round(Math.hypot(physicsState.position.x - target.x, physicsState.position.z - target.z));
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2.5 md:p-5 overflow-hidden">
      {/* Top Section: Player Bar, Mission Banner & System Quick Controls */}
      <div className="flex items-start justify-between w-full gap-2 md:gap-4">
        {/* Left: Player Profile & Cash */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 px-3.5 shadow-2xl pointer-events-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm shadow">
            {level}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-black text-amber-400 text-sm md:text-base">
              <span>{cash.toLocaleString()}</span>
              <span className="text-[10px] text-amber-300/80">ج.م</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>مستوى {level}</span>
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(xp % 200) / 2}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission Objective & Taxi Meter */}
        {mission && missionStage !== 'inactive' && missionStage !== 'completed' ? (
          <div className="bg-slate-900/95 border-2 border-sky-500/60 rounded-2xl p-2.5 px-4 shadow-2xl max-w-md w-full flex flex-col gap-1 text-center pointer-events-auto">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Navigation className="w-4 h-4 animate-pulse text-sky-400" />
                {missionStage === 'pickup' ? 'التقاط الراكب (سوق لعنده)' : 'توصيل الراكب للوجهة'}
              </span>
              <span
                className={`font-mono px-2 py-0.5 rounded text-xs font-black ${
                  missionTimeRemaining < 20 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-200'
                }`}
              >
                ⏱ {Math.floor(missionTimeRemaining / 60)}:
                {(Math.floor(missionTimeRemaining) % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="font-black text-sm md:text-base text-white truncate">
              {missionStage === 'pickup' ? mission.startLocation.nameAr : mission.targetLocation.nameAr}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-1">
              <span>
                المسافة: <strong className="text-amber-400 font-mono">{missionTargetDist} م</strong>
              </span>
              <span className="bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 text-emerald-400 font-bold font-mono">
                عداد التاكسي: {missionStage === 'in_transit' ? `${Math.round(meterFare)} ج.م` : 'طلب جديد'}
              </span>
            </div>

            {mission.passengerDialogue && (
              <div className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-xl p-1 px-2 mt-0.5 italic text-center">
                💬 "{mission.passengerDialogue}"
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onOpenMissions}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-600 via-sky-500 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-xl border border-sky-300/40 transition active:scale-95"
            >
              <Navigation className="w-4 h-4 animate-bounce" />
              <span>قائمة طلبات الركاب والمهام</span>
            </button>
          </div>
        )}

        {/* Right: Sound & Menu Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
          {/* Camera switch */}
          <button
            onClick={onSwitchCamera}
            title={`الكاميرا: ${cameraMode}`}
            className="p-2 md:p-2.5 rounded-2xl bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-slate-800 transition shadow-lg"
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Engine Sound Mute Button (Dedicated) */}
          <button
            onClick={handleToggleEngineMute}
            title={isEngineMuted ? 'تشغيل صوت المحرك' : 'كتم صوت المحرك فقط (للاستماع للراديو بوضوح)'}
            className={`p-2 md:p-2.5 rounded-2xl border transition shadow-lg flex items-center gap-1.5 text-xs font-black ${
              isEngineMuted
                ? 'bg-red-950/90 border-red-500 text-red-400'
                : 'bg-slate-900/90 border-slate-700 text-emerald-400 hover:bg-slate-800'
            }`}
          >
            <span>🚗</span>
            <span className="hidden sm:inline">{isEngineMuted ? 'المحرك مكتوم' : 'صوت المحرك'}</span>
          </button>

          {/* Master Volume Mute */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'تشغيل الصوت العام' : 'كتم جميع الأصوات'}
            className="p-2 md:p-2.5 rounded-2xl bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-slate-800 transition shadow-lg"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            )}
          </button>

          {/* Garage */}
          <button
            onClick={onOpenGarage}
            title="الجراج والمعرض"
            className="p-2 md:p-2.5 rounded-2xl bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-slate-800 transition shadow-lg"
          >
            <Car className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
          </button>

          {/* Pause */}
          <button
            onClick={onOpenPause}
            title="إيقاف مؤقت"
            className="p-2 md:p-2.5 rounded-2xl bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-slate-800 transition shadow-lg"
          >
            <Pause className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Professional Egyptian Automotive Radio Console (Placed prominently on top-right below top bar) */}
      <div className="flex justify-end pointer-events-auto my-1">
        <div className="bg-slate-900/95 border-2 border-slate-700/90 rounded-2xl p-2 px-3 shadow-2xl flex items-center gap-2.5 max-w-md w-full backdrop-blur-md">
          {/* Radio Power Button */}
          <button
            onClick={handleToggleRadio}
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              radioActive
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg animate-pulse ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={radioActive ? 'إيقاف الراديو' : 'تشغيل الراديو السكندري'}
          >
            <Radio className="w-5 h-5" />
          </button>

          {/* Station & Song Info Display */}
          <div className="flex flex-col flex-1 min-w-0 text-right">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 font-bold">{currentStation.genreAr}</span>
              <span className="text-[10px] text-slate-400">راديو الإسكندرية</span>
            </div>
            <span className="text-xs font-black text-white truncate flex items-center gap-1">
              <Disc className={`w-3.5 h-3.5 text-sky-400 ${radioActive ? 'animate-spin' : ''}`} />
              {currentStation.nameAr}
            </span>
            <span className="text-[11px] text-amber-300 truncate font-medium">
              {radioActive ? currentStation.currentTrackAr : 'الراديو متوقف • اضغط زر التشغيل'}
            </span>
          </div>

          {/* Controls: Mute Radio, Prev, Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleRadioMute}
              title={isRadioMuted ? 'تشغيل صوت الأغاني' : 'كتم صوت الراديو فقط'}
              className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                isRadioMuted
                  ? 'bg-red-950 border-red-500 text-red-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🎵 {isRadioMuted ? 'مكتوم' : 'صوت'}
            </button>
            <button
              onClick={handlePrevStation}
              title="المحطة السابقة"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextStation}
              title="المحطة التالية"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Alerts: Gas Station / Workshop Interactive Prompts */}
      <div className="flex flex-col items-center justify-center gap-2 pointer-events-auto">
        {nearGasStation && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-600/95 to-amber-600/95 text-white p-3 px-5 rounded-2xl shadow-2xl border border-amber-300/60 animate-bounce">
            <Fuel className="w-6 h-6" />
            <div className="flex flex-col text-right">
              <span className="font-black text-sm">محطة وقود مصر للبترول</span>
              <span className="text-xs text-amber-100">سعر الفول تانك: 40 ج.م</span>
            </div>
            <button
              onClick={onRefuel}
              className="bg-white text-red-600 hover:bg-amber-100 font-black text-xs px-4 py-2 rounded-xl transition shadow active:scale-95"
            >
              تَفْوِيل ⛽
            </button>
          </div>
        )}

        {nearWorkshop && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-600/95 to-orange-600/95 text-white p-3 px-5 rounded-2xl shadow-2xl border border-amber-300/60 animate-bounce">
            <Wrench className="w-6 h-6" />
            <div className="flex flex-col text-right">
              <span className="font-black text-sm">ورشة الأسطى حسن</span>
              <span className="text-xs text-amber-100">سمكرة وميكانيكا: 60 ج.م</span>
            </div>
            <button
              onClick={onRepair}
              className="bg-white text-amber-700 hover:bg-amber-100 font-black text-xs px-4 py-2 rounded-xl transition shadow active:scale-95"
            >
              صيانة كاملة 🔧
            </button>
          </div>
        )}

        {physicsState.health < 25 && (
          <div className="flex items-center gap-2 bg-red-600/90 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg border border-red-400">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>تحذير: العربية خبطت جامد! روح لورشة الأسطى حسن فوراً!</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Mini-Map, Speedometer & Mobile Touch Controls */}
      <div className="flex items-end justify-between w-full gap-3">
        {/* Left Bottom: Alexandria Mini-Map & Gauges */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Circular GPS Mini-Map */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-slate-900/95 border-2 border-slate-700/80 shadow-2xl overflow-hidden p-1 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-900/70 via-sky-800/40 to-slate-800/80 rounded-full" />
            <div className="absolute left-[38%] top-0 bottom-0 w-0.5 bg-sky-400/50" />
            <div className="absolute left-[32%] top-[38%] w-10 h-1 bg-amber-400/80 -rotate-12" title="Stanley Bridge" />

            {/* Player vehicle pin */}
            <div
              className="absolute w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white shadow-[0_0_10px_#f59e0b] z-20 transition-all duration-75"
              style={{
                left: `${Math.max(10, Math.min(90, mapPlayerX))}%`,
                top: `${Math.max(10, Math.min(90, mapPlayerY))}%`,
                transform: `translate(-50%, -50%) rotate(${physicsState.heading}rad)`,
              }}
            >
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[7px] border-b-white -mt-1 mx-auto" />
            </div>

            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-500 z-10">
              ش
            </div>
            <div className="absolute bottom-1.5 text-[9px] text-slate-300 font-bold z-10">
              خريطة إسكندرية
            </div>
          </div>

          {/* Fuel & Health Gauges */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 px-3 shadow-lg flex flex-col gap-1 w-36 md:w-44">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1 text-red-400">
                <Fuel className="w-3 h-3" /> البنزين
              </span>
              <span className="font-mono text-slate-200">{Math.round(physicsState.fuel)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  physicsState.fuel < 20 ? 'bg-red-500' : physicsState.fuel < 50 ? 'bg-amber-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${physicsState.fuel}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold pt-0.5">
              <span className="flex items-center gap-1 text-sky-400">
                <Wrench className="w-3 h-3" /> الحالة
              </span>
              <span className="font-mono text-slate-200">{Math.round(physicsState.health)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  physicsState.health < 30 ? 'bg-red-500' : physicsState.health < 65 ? 'bg-amber-500' : 'bg-sky-400'
                }`}
                style={{ width: `${physicsState.health}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center Bottom: Speedometer & Gear */}
        <div className="bg-slate-900/95 border-2 border-slate-700/80 rounded-3xl p-3 px-5 shadow-2xl flex items-center gap-4 pointer-events-auto">
          {/* Gear Display */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">الغيار</span>
            <span
              className={`text-2xl font-black ${
                physicsState.gear === 'D'
                  ? 'text-emerald-400'
                  : physicsState.gear === 'R'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {physicsState.gear}
            </span>
          </div>

          {/* Speed Digital Readout */}
          <div className="flex flex-col items-center min-w-[65px]">
            <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white drop-shadow">
              {Math.abs(physicsState.speedKmh)}
            </span>
            <span className="text-[10px] text-slate-400 font-black uppercase">كم / ساعة</span>
          </div>

          {/* Horn button */}
          <button
            onClick={handleHorn}
            title="كلاكس (H)"
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition active:scale-90"
          >
            <span className="text-xl">📢</span>
            <span className="text-[9px] font-black">كلاكس</span>
          </button>
        </div>

        {/* Right Bottom: Mobile On-Screen Touch Controls */}
        <div className="flex items-end gap-2.5 pointer-events-auto">
          {/* Steering Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={() => {
                setTouchLeft(true);
                onControlInput({ steerLeft: true });
              }}
              onPointerUp={() => {
                setTouchLeft(false);
                onControlInput({ steerLeft: false });
              }}
              onPointerLeave={() => {
                setTouchLeft(false);
                onControlInput({ steerLeft: false });
              }}
              className={`w-13 h-13 md:w-16 md:h-16 rounded-2xl border text-xl font-black flex items-center justify-center transition shadow-xl active:scale-90 ${
                touchLeft ? 'bg-sky-500 text-white border-sky-300' : 'bg-slate-900/90 text-slate-200 border-slate-700'
              }`}
            >
              ◀
            </button>
            <button
              onPointerDown={() => {
                setTouchRight(true);
                onControlInput({ steerRight: true });
              }}
              onPointerUp={() => {
                setTouchRight(false);
                onControlInput({ steerRight: false });
              }}
              onPointerLeave={() => {
                setTouchRight(false);
                onControlInput({ steerRight: false });
              }}
              className={`w-13 h-13 md:w-16 md:h-16 rounded-2xl border text-xl font-black flex items-center justify-center transition shadow-xl active:scale-90 ${
                touchRight ? 'bg-sky-500 text-white border-sky-300' : 'bg-slate-900/90 text-slate-200 border-slate-700'
              }`}
            >
              ▶
            </button>
          </div>

          {/* Pedals */}
          <div className="flex items-center gap-1.5">
            {/* Handbrake / Drift */}
            <button
              onPointerDown={() => {
                setTouchHandbrake(true);
                onControlInput({ handbrake: true });
              }}
              onPointerUp={() => {
                setTouchHandbrake(false);
                onControlInput({ handbrake: false });
              }}
              onPointerLeave={() => {
                setTouchHandbrake(false);
                onControlInput({ handbrake: false });
              }}
              className={`w-11 h-12 md:w-13 md:h-14 rounded-2xl border text-xs font-black flex flex-col items-center justify-center transition shadow-xl active:scale-90 ${
                touchHandbrake
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-900/90 text-amber-400 border-slate-700'
              }`}
            >
              <span>((P))</span>
              <span className="text-[9px]">دريفت</span>
            </button>

            {/* Brake / Reverse */}
            <button
              onPointerDown={() => {
                setTouchReverse(true);
                onControlInput({ reverse: true });
              }}
              onPointerUp={() => {
                setTouchReverse(false);
                onControlInput({ reverse: false });
              }}
              onPointerLeave={() => {
                setTouchReverse(false);
                onControlInput({ reverse: false });
              }}
              className={`w-13 h-16 md:w-16 md:h-20 rounded-2xl border text-sm font-black flex flex-col items-center justify-center transition shadow-xl active:scale-90 ${
                touchReverse ? 'bg-red-600 text-white border-red-400' : 'bg-slate-900/90 text-red-400 border-slate-700'
              }`}
            >
              <span>فرامل</span>
              <span className="text-[9px] text-slate-400">رجوع</span>
            </button>

            {/* Gas Pedal */}
            <button
              onPointerDown={() => {
                setTouchThrottle(true);
                onControlInput({ throttle: true });
              }}
              onPointerUp={() => {
                setTouchThrottle(false);
                onControlInput({ throttle: false });
              }}
              onPointerLeave={() => {
                setTouchThrottle(false);
                onControlInput({ throttle: false });
              }}
              className={`w-15 h-20 md:w-20 md:h-24 rounded-2xl border text-base font-black flex flex-col items-center justify-center transition shadow-2xl active:scale-95 ${
                touchThrottle
                  ? 'bg-emerald-500 text-white border-emerald-300'
                  : 'bg-slate-900/95 text-emerald-400 border-emerald-500/50'
              }`}
            >
              <span className="text-xl">▲</span>
              <span>بنزين</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
