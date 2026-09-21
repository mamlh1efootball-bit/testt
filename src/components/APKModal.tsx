import React, { useState } from 'react';
import { Smartphone, Download, Check, Copy, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundHaptic } from '../utils/audioHaptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const APKModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundHaptic.triggerKeyFeedback('equals');
    const res = await install();
    if (res) {
      setInstallSuccess(true);
    }
  };

  const handleCopyUrl = async () => {
    soundHaptic.triggerKeyFeedback('tap');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0e1628] via-[#090d18] to-[#060911] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>نصب اپلیکیشن اندروید (APK)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  نسخه آفلاین
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">نصب مستقیم روی گوشی یا دریافت APK</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-200 text-xs leading-relaxed">
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 flex items-center gap-2.5 text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                این برنامه قبلاً به صورت اپلیکیشن روی دستگاه شما نصب شده است!
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-sky-950/60 border border-indigo-800/60 flex items-center gap-2.5 text-slate-200">
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <span className="font-bold text-sky-300 block mb-0.5">نصب اختصاصی و سریع روی گوشی</span>
                <span>
                  این برنامه با معماری مدرن PWA / WebAPK ساخته شده و دقیقا مانند یک فایل APK اندروید با آیکون اختصاصی و بدون نوار مرورگر نصب می‌شود.
                </span>
              </div>
            </div>
          )}

          {/* Option 1: Direct One-Click Install */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                روش ۱: نصب مستقیم با یک کلیک (پیشنهادی)
              </span>
            </div>
            <p className="text-slate-400">
              روی دکمه زیر کلیک کنید تا اپلیکیشن بلافاصله به منوی گوشی شما اضافه شود:
            </p>

            {isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>نصب مستقیم اپلیکیشن روی گوشی</span>
              </button>
            ) : isIOS ? (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                در آیفون (iOS): دکمه <strong>Share</strong> (اشتراک‌گذاری) در پایین سافاری را بزنید و سپس گزینه <strong>«Add to Home Screen»</strong> را لمس کنید.
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex flex-col gap-1.5">
                <span>
                  برای نصب در اندروید: روی منوی سه نقطه (⋮) بالای مرورگر کلیک کنید و گزینه <strong>«نصب برنامه» (Install app)</strong> یا <strong>«افزودن به صفحه اصلی» (Add to Home screen)</strong> را انتخاب نمایید.
                </span>
              </div>
            )}

            {installSuccess && (
              <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" />
                دستور نصب ارسال شد! آیکون برنامه در صفحه اصلی گوشی شما قرار گرفت.
              </div>
            )}
          </div>

          {/* Option 2: Download raw APK / Build APK */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              روش ۲: تولید فایل خام نصبی (APK.) برای کافه بازار / مایکت
            </span>
            <p className="text-slate-400">
              اگر فایل مستقل APK خام می‌خواهید، این برنامه آماده ساخت پکیج APK استاندارد اندروید است:
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyUrl}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition font-medium"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'آدرس کپی شد!' : 'کپی لینک اپلیکیشن'}</span>
              </button>

              <a
                href="https://www.pwabuilder.com"
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 active:scale-95 transition font-medium"
              >
                <span>خروجی APK آنلاین</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              با قرار دادن لینک کپی شده در سرویس PWABuilder می‌توانید در کمتر از ۳۰ ثانیه فایل امضا شده <strong>.apk</strong> استاندارد اندروید را دانلود کنید.
            </p>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
            <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>کارکرد ۱۰۰٪ آفلاین</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>ذخیره خودکار تاریخچه</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>موتور رسم ۶۰ فریم بر ثانیه</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>پشتیبانی از فرمول‌های پیچیده</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
