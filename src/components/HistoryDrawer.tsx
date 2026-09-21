import React, { useState } from 'react';
import { Trash2, Star, Copy, ArrowUpRight, Search, Check, Download, History as HistoryIcon } from 'lucide-react';
import { HistoryItem } from '../types';
import { soundHaptic } from '../utils/audioHaptics';

interface Props {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectExpression: (expr: string) => void;
  onSelectResult: (res: string) => void;
}

export const HistoryDrawer: React.FC<Props> = ({
  history,
  onClearHistory,
  onDeleteItem,
  onToggleFavorite,
  onSelectExpression,
  onSelectResult,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter((item) => {
    if (filterFavoriteOnly && !item.isFavorite) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.expression.toLowerCase().includes(q) || item.result.toLowerCase().includes(q);
  });

  const handleCopy = async (id: string, text: string) => {
    soundHaptic.triggerKeyFeedback('tap');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const handleExportHistory = () => {
    soundHaptic.triggerKeyFeedback('action');
    const content = history
      .map(
        (h) =>
          `[${new Date(h.timestamp).toLocaleString('fa-IR')}] ${h.expression} = ${h.result}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexCalc-History-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="history-view-container" className="flex flex-col h-full bg-[#080c16] text-slate-100 select-none">
      {/* 1. Header Toolbar */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-[#0a1020] to-slate-900 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold text-slate-200">تاریخچه محاسبات</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportHistory}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="دانلود تاریخچه به عنوان فایل متنی"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    soundHaptic.triggerKeyFeedback('clear');
                    if (window.confirm('آیا از پاک کردن کل تاریخچه محاسبات مطمئن هستید؟')) {
                      onClearHistory();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                  title="پاک کردن کل تاریخچه"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Favorites Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute right-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در محاسبات..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-1.5 pr-8 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
          <button
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              setFilterFavoriteOnly(!filterFavoriteOnly);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1 transition ${
              filterFavoriteOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterFavoriteOnly ? 'fill-amber-400' : ''}`} />
            <span>علاقه‌مندی‌ها</span>
          </button>
        </div>
      </div>

      {/* 2. History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <HistoryIcon className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-sm font-medium">
              {searchQuery || filterFavoriteOnly
                ? 'موردی با این فیلتر یافت نشد'
                : 'هنوز هیچ محاسبه‌ای ذخیره نشده است'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              با زدن دکمه مساوی (=) در ماشین‌حساب، محاسبات شما به طور خودکار اینجا ذخیره می‌شوند.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c1222] border border-slate-800/90 hover:border-slate-700/90 transition shadow-sm group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>{new Date(item.timestamp).toLocaleTimeString('fa-IR')}</span>
                <div className="flex items-center gap-1">
                  {/* Star Favorite Button */}
                  <button
                    onClick={() => {
                      soundHaptic.triggerKeyFeedback('tap');
                      onToggleFavorite(item.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-amber-400 transition"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                  </button>
                  {/* Delete Item */}
                  <button
                    onClick={() => {
                      soundHaptic.triggerKeyFeedback('action');
                      onDeleteItem(item.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expression */}
              <div
                onClick={() => {
                  soundHaptic.triggerKeyFeedback('tap');
                  onSelectExpression(item.expression);
                }}
                className="font-mono text-sm text-slate-300 dir-ltr text-left cursor-pointer hover:text-sky-300 transition py-0.5"
                title="کلیک برای ارسال عبارت به ماشین حساب"
              >
                {item.expression}
              </div>

              {/* Result & Actions */}
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-800/60">
                <span
                  onClick={() => {
                    soundHaptic.triggerKeyFeedback('tap');
                    onSelectResult(item.result);
                  }}
                  className="font-mono text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 dir-ltr text-left cursor-pointer hover:opacity-80 transition"
                  title="کلیک برای ارسال پاسخ (Ans) به ماشین حساب"
                >
                  = {item.result}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item.id, item.result)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-[11px] text-slate-300 transition"
                    title="کپی نتیجه"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                    <span>کپی</span>
                  </button>
                  <button
                    onClick={() => {
                      soundHaptic.triggerKeyFeedback('tap');
                      onSelectExpression(item.expression);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-800/50 text-[11px] text-indigo-300 transition"
                    title="استفاده مجدد در ماشین‌حساب"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>استفاده</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
