import React, { useState, useEffect } from 'react';
import { Calculator, LineChart, History as HistoryIcon, Download, Smartphone } from 'lucide-react';
import { AngleMode, AppTab, HistoryItem } from './types';
import { AndroidStatusHeader } from './components/AndroidStatusHeader';
import { ScientificKeypad } from './components/ScientificKeypad';
import { GraphView } from './components/GraphView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { APKModal } from './components/APKModal';
import { soundHaptic } from './utils/audioHaptics';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('calculator');
  const [angleMode, setAngleMode] = useState<AngleMode>('RAD');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastAns, setLastAns] = useState<string>('0');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState<boolean>(false);
  const [initialCalcExpr, setInitialCalcExpr] = useState<string>('');

  // Load persistent history and preferences from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('apex_calc_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedAngle = localStorage.getItem('apex_angle_mode');
      if (savedAngle === 'DEG' || savedAngle === 'RAD') {
        setAngleMode(savedAngle);
      }
      const savedAns = localStorage.getItem('apex_last_ans');
      if (savedAns) {
        setLastAns(savedAns);
      }
      // On desktop wider than 1024px, start in mobile frame mode by default for authentic APK preview
      if (window.innerWidth >= 1024) {
        setIsMobileFrame(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history updates
  const saveHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 100); // limit to 100 items
      try {
        localStorage.setItem('apex_calc_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('apex_calc_history');
    } catch {}
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('apex_calc_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleFavorite = (id: string) => {
    setHistory((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      try {
        localStorage.setItem('apex_calc_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleAngleMode = () => {
    const next = angleMode === 'RAD' ? 'DEG' : 'RAD';
    setAngleMode(next);
    try {
      localStorage.setItem('apex_angle_mode', next);
    } catch {}
  };

  const handleUpdateLastAns = (ans: string) => {
    setLastAns(ans);
    try {
      localStorage.setItem('apex_last_ans', ans);
    } catch {}
  };

  const handleSelectExpression = (expr: string) => {
    setInitialCalcExpr(expr);
    setActiveTab('calculator');
  };

  const handleSelectResult = (res: string) => {
    setLastAns(res);
    setInitialCalcExpr(`Ans`);
    setActiveTab('calculator');
  };

  const toggleSound = () => {
    const current = soundHaptic.toggleSound();
    setSoundEnabled(current);
  };

  return (
    <div className="min-h-screen bg-[#04070f] text-slate-100 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Container: either Native Mobile Frame or Fullscreen Canvas */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isMobileFrame
            ? 'max-w-[440px] h-[94vh] max-h-[890px] rounded-[42px] border-[8px] border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)] ring-1 ring-slate-700/50 relative overflow-hidden bg-[#070b14]'
            : 'max-w-4xl h-screen sm:h-[94vh] sm:rounded-3xl border-0 sm:border border-slate-800 shadow-2xl overflow-hidden bg-[#070b14]'
        }`}
      >
        {/* Android Punch Hole Camera on Mobile Frame */}
        {isMobileFrame && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black border border-slate-700/60 z-50 pointer-events-none flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0b1220]" />
          </div>
        )}

        {/* 1. Top Android Status & App Header */}
        <AndroidStatusHeader
          angleMode={angleMode}
          onToggleAngleMode={handleToggleAngleMode}
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
          onOpenAPKModal={() => setIsAPKModalOpen(true)}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />

        {/* 2. Main Viewport Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === 'calculator' && (
            <ScientificKeypad
              angleMode={angleMode}
              onToggleAngleMode={handleToggleAngleMode}
              onSaveToHistory={saveHistoryItem}
              lastAns={lastAns}
              setLastAns={handleUpdateLastAns}
              initialExpression={initialCalcExpr}
            />
          )}

          {activeTab === 'graph' && <GraphView angleMode={angleMode} />}

          {activeTab === 'history' && (
            <HistoryDrawer
              history={history}
              onClearHistory={handleClearHistory}
              onDeleteItem={handleDeleteHistoryItem}
              onToggleFavorite={handleToggleFavorite}
              onSelectExpression={handleSelectExpression}
              onSelectResult={handleSelectResult}
            />
          )}
        </div>

        {/* 3. Bottom Android App Navigation Tabs */}
        <div
          id="android-bottom-navigation"
          className="bg-[#060911] border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around select-none z-20"
        >
          <button
            id="tab-calculator"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              setActiveTab('calculator');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'calculator'
                ? 'text-sky-400 font-bold bg-sky-950/40 border border-sky-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[11px]">ماشین‌حساب</span>
          </button>

          <button
            id="tab-graph"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              setActiveTab('graph');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'graph'
                ? 'text-sky-400 font-bold bg-sky-950/40 border border-sky-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-5 h-5" />
            <span className="text-[11px]">رسم نمودار</span>
          </button>

          <button
            id="tab-history"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              setActiveTab('history');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl relative transition-all ${
              activeTab === 'history'
                ? 'text-sky-400 font-bold bg-sky-950/40 border border-sky-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <HistoryIcon className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                  {history.length > 99 ? '99+' : history.length}
                </span>
              )}
            </div>
            <span className="text-[11px]">تاریخچه</span>
          </button>

          <button
            id="tab-apk-download"
            onClick={() => {
              soundHaptic.triggerKeyFeedback('action');
              setIsAPKModalOpen(true);
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-emerald-400 hover:text-emerald-300 transition-all active:scale-95"
          >
            <Download className="w-5 h-5 animate-pulse" />
            <span className="text-[11px] font-semibold">نصب APK</span>
          </button>
        </div>

        {/* Android Gesture Bar Navigation Pill */}
        {isMobileFrame && (
          <div className="w-full bg-[#060911] pb-1.5 flex justify-center items-center pointer-events-none">
            <div className="w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        )}
      </div>

      {/* APK Installation / Download Modal */}
      <APKModal isOpen={isAPKModalOpen} onClose={() => setIsAPKModalOpen(false)} />
    </div>
  );
}
