import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Volume2, VolumeX, Smartphone, Monitor, Download } from 'lucide-react';
import { AngleMode } from '../types';
import { soundHaptic } from '../utils/audioHaptics';

interface Props {
  angleMode: AngleMode;
  onToggleAngleMode: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  onOpenAPKModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AndroidStatusHeader: React.FC<Props> = ({
  angleMode,
  onToggleAngleMode,
  isMobileFrame,
  onToggleMobileFrame,
  onOpenAPKModal,
  soundEnabled,
  onToggleSound,
}) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="android-status-header" className="w-full bg-[#060911] border-b border-slate-800/80 select-none">
      {/* Native Android OS Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-400 font-mono">
        <span className="font-semibold text-slate-300">{time || '12:00'}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider text-emerald-400 px-1 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50">
            5G
          </span>
          <Wifi className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-1">
            <span className="text-[10px]">100%</span>
            <BatteryMedium className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* App Toolbar with APK & Mobile Action buttons */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-slate-900/95 via-[#0b1222] to-slate-900/95">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <span className="text-xs font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                fx
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>ماشین‌حساب مهندسی</span>
              <span className="text-[10px] px-1.5 py-0.2 font-mono font-normal bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                APK
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">محاسبات پیشرفته و رسم نمودار</p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5">
          {/* Angle Mode DEG/RAD button */}
          <button
            id="btn-toggle-angle-mode"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onToggleAngleMode();
            }}
            className="px-2 py-1 text-xs font-mono font-bold rounded-lg transition-all border border-slate-700 hover:border-indigo-500 bg-slate-800/80 text-indigo-300"
            title="تغییر حالت زاویه (درجه / رادیان)"
          >
            {angleMode}
          </button>

          {/* Sound Mute/Unmute */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onToggleSound();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/80 transition-all"
            title={soundEnabled ? 'صدای کلیدها روشن است' : 'صدای کلیدها خاموش است'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile frame toggle */}
          <button
            id="btn-toggle-frame-mode"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onToggleMobileFrame();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/80 transition-all hidden sm:flex"
            title={isMobileFrame ? 'نمایش تمام‌صفحه' : 'نمایش در فریم گوشی موبایل'}
          >
            {isMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5 text-sky-400" />}
          </button>

          {/* Download / Install APK Button */}
          <button
            id="btn-open-apk-install"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onOpenAPKModal();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span className="font-semibold">نصب APK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
