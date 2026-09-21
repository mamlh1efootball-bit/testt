import React, { useState, useEffect, useRef } from 'react';
import { Delete, RotateCcw, Copy, Check, Sparkles } from 'lucide-react';
import { AngleMode, HistoryItem } from '../types';
import { evaluateExpression } from '../utils/mathEngine';
import { soundHaptic } from '../utils/audioHaptics';

interface Props {
  angleMode: AngleMode;
  onToggleAngleMode: () => void;
  onSaveToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  lastAns: string;
  setLastAns: (ans: string) => void;
  initialExpression?: string;
}

export const ScientificKeypad: React.FC<Props> = ({
  angleMode,
  onToggleAngleMode,
  onSaveToHistory,
  lastAns,
  setLastAns,
  initialExpression,
}) => {
  const [expression, setExpression] = useState('');
  const [liveResult, setLiveResult] = useState('');
  const [liveError, setLiveError] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'trig' | 'power' | 'constants'>('trig');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial expression if chosen from history
  useEffect(() => {
    if (initialExpression !== undefined && initialExpression !== '') {
      setExpression(initialExpression);
      setIsCalculated(false);
    }
  }, [initialExpression]);

  // Live evaluation on typing
  useEffect(() => {
    if (!expression.trim()) {
      setLiveResult('');
      setLiveError('');
      return;
    }

    const { success, result, error } = evaluateExpression(expression, angleMode, lastAns || 0);
    if (success && result && result !== expression) {
      setLiveResult(result);
      setLiveError('');
    } else {
      setLiveResult('');
      setLiveError(error || '');
    }
  }, [expression, angleMode, lastAns]);

  // Handle hardware keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on another input
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) {
        return;
      }

      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (/^[0-9+\-*/().,%^]$/.test(e.key)) {
        e.preventDefault();
        let char = e.key;
        if (char === '*') char = '×';
        if (char === '/') char = '÷';
        if (char === '-') char = '−';
        handleInsert(char);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expression, liveResult, angleMode, lastAns]);

  const handleInsert = (str: string) => {
    soundHaptic.triggerKeyFeedback('tap');
    if (isCalculated) {
      // If user starts with an operator (+, -, *, /) continue from previous result
      if (['+', '−', '×', '÷', '^', '%'].includes(str) && liveResult) {
        setExpression(liveResult + str);
      } else {
        setExpression(str);
      }
      setIsCalculated(false);
    } else {
      setExpression((prev) => prev + str);
    }
  };

  const handleClear = () => {
    soundHaptic.triggerKeyFeedback('clear');
    setExpression('');
    setLiveResult('');
    setLiveError('');
    setIsCalculated(false);
  };

  const handleBackspace = () => {
    soundHaptic.triggerKeyFeedback('action');
    if (isCalculated) {
      setExpression('');
      setIsCalculated(false);
      return;
    }
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEquals = () => {
    if (!expression.trim()) return;
    soundHaptic.triggerKeyFeedback('equals');

    const { success, result, error } = evaluateExpression(expression, angleMode, lastAns || 0);

    if (success) {
      onSaveToHistory({
        expression,
        result,
      });
      setLastAns(result);
      setLiveResult(result);
      setIsCalculated(true);
      setLiveError('');
    } else {
      setLiveError(error || 'خطا در محاسبه');
    }
  };

  const handleCopyResult = async () => {
    const textToCopy = isCalculated ? liveResult : liveResult || expression;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  // Keyboard button click handler
  const btnClick = (char: string, type: 'tap' | 'action' | 'clear' | 'equals' = 'tap') => {
    soundHaptic.triggerKeyFeedback(type);
    handleInsert(char);
  };

  return (
    <div id="scientific-keypad-container" className="flex flex-col h-full bg-[#080c16] text-slate-100 select-none">
      {/* 1. Mathematical Display Screen */}
      <div className="p-4 bg-gradient-to-b from-[#090e1a] to-[#0d1424] border-b border-slate-800/80 shadow-inner flex flex-col justify-end min-h-[140px] max-h-[170px] relative">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAngleMode}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 border border-slate-700 text-sky-400 hover:bg-slate-700 transition"
            >
              {angleMode}
            </button>
            {lastAns && (
              <span className="text-[11px] font-mono text-slate-500">
                Ans = {lastAns.length > 8 ? lastAns.slice(0, 8) + '…' : lastAns}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyResult}
              disabled={!liveResult && !expression}
              className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 transition"
              title="کپی نتیجه"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
              title="پاک کردن همه"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expression Input Text */}
        <div className="overflow-x-auto whitespace-nowrap text-left dir-ltr py-1 scrollbar-none">
          <span
            className={`font-mono transition-all duration-150 ${
              isCalculated ? 'text-lg text-slate-400' : 'text-2xl sm:text-3xl font-semibold text-slate-100'
            }`}
          >
            {expression || '0'}
          </span>
          {!isCalculated && <span className="inline-block w-2 h-6 bg-sky-400 ml-1 animate-pulse" />}
        </div>

        {/* Live Answer or Error Preview */}
        <div className="flex items-center justify-between min-h-[36px] mt-1 text-left dir-ltr">
          {liveError ? (
            <span className="text-xs text-rose-400 font-sans font-medium flex items-center gap-1 dir-rtl">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {liveError}
            </span>
          ) : liveResult ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                نتیجه:
              </span>
              <span
                className={`font-mono font-bold tracking-tight transition-all ${
                  isCalculated
                    ? 'text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400'
                    : 'text-xl sm:text-2xl text-sky-400/90'
                }`}
              >
                = {liveResult}
              </span>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* 2. Engineering Tabs */}
      <div className="flex items-center border-b border-slate-800/80 bg-[#070b14] px-2 py-1 text-xs">
        <button
          onClick={() => {
            soundHaptic.triggerKeyFeedback('action');
            setActiveTab('trig');
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${
            activeTab === 'trig'
              ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          مثلثات و هذلولوی
        </button>
        <button
          onClick={() => {
            soundHaptic.triggerKeyFeedback('action');
            setActiveTab('power');
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${
            activeTab === 'power'
              ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          توان، رادیکال و لگاریتم
        </button>
        <button
          onClick={() => {
            soundHaptic.triggerKeyFeedback('action');
            setActiveTab('constants');
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${
            activeTab === 'constants'
              ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ثابت‌ها و پیشرفته
        </button>
      </div>

      {/* 3. Dynamic Function Grid for Selected Tab */}
      <div className="p-2 bg-[#0a0f1c] border-b border-slate-800/80">
        {activeTab === 'trig' && (
          <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
            <button
              onClick={() => btnClick('sin(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-300 active:scale-95 transition"
            >
              sin
            </button>
            <button
              onClick={() => btnClick('cos(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-300 active:scale-95 transition"
            >
              cos
            </button>
            <button
              onClick={() => btnClick('tan(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-300 active:scale-95 transition"
            >
              tan
            </button>
            <button
              onClick={() => btnClick('cot(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-300 active:scale-95 transition"
            >
              cot
            </button>
            <button
              onClick={() => btnClick('asin(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-sky-300 active:scale-95 transition"
            >
              sin⁻¹
            </button>
            <button
              onClick={() => btnClick('acos(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-sky-300 active:scale-95 transition"
            >
              cos⁻¹
            </button>
            <button
              onClick={() => btnClick('atan(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-sky-300 active:scale-95 transition"
            >
              tan⁻¹
            </button>
            <button
              onClick={() => btnClick('sinh(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              sinh
            </button>
            <button
              onClick={() => btnClick('cosh(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              cosh
            </button>
            <button
              onClick={() => btnClick('tanh(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              tanh
            </button>
          </div>
        )}

        {activeTab === 'power' && (
          <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
            <button
              onClick={() => btnClick('^2')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-amber-300 active:scale-95 transition"
            >
              x²
            </button>
            <button
              onClick={() => btnClick('^')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-amber-300 active:scale-95 transition"
            >
              xʸ
            </button>
            <button
              onClick={() => btnClick('sqrt(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-amber-300 active:scale-95 transition"
            >
              √x
            </button>
            <button
              onClick={() => btnClick('cbrt(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-amber-300 active:scale-95 transition"
            >
              ∛x
            </button>
            <button
              onClick={() => btnClick('ln(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-300 active:scale-95 transition"
            >
              ln
            </button>
            <button
              onClick={() => btnClick('log10(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-300 active:scale-95 transition"
            >
              log₁₀
            </button>
            <button
              onClick={() => btnClick('log2(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-300 active:scale-95 transition"
            >
              log₂
            </button>
            <button
              onClick={() => btnClick('exp(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-300 active:scale-95 transition"
            >
              eˣ
            </button>
            <button
              onClick={() => btnClick('10^')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-emerald-300 active:scale-95 transition"
            >
              10ˣ
            </button>
            <button
              onClick={() => btnClick('!')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-rose-300 active:scale-95 transition"
            >
              x!
            </button>
          </div>
        )}

        {activeTab === 'constants' && (
          <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
            <button
              onClick={() => btnClick('pi')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-violet-300 active:scale-95 transition"
            >
              π (3.14)
            </button>
            <button
              onClick={() => btnClick('e')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-violet-300 active:scale-95 transition"
            >
              e (2.71)
            </button>
            <button
              onClick={() => btnClick('phi')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-violet-300 active:scale-95 transition"
            >
              φ (1.61)
            </button>
            <button
              onClick={() => btnClick('c')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-violet-300 active:scale-95 transition"
              title="سرعت نور در خلا"
            >
              c (نور)
            </button>
            <button
              onClick={() => btnClick('abs(')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-sky-300 active:scale-95 transition"
            >
              |x|
            </button>
            <button
              onClick={() => btnClick('mod')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              mod
            </button>
            <button
              onClick={() => btnClick('i')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-pink-300 active:scale-95 transition"
              title="عدد مختلط i"
            >
              i
            </button>
            <button
              onClick={() => btnClick('%')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              %
            </button>
            <button
              onClick={() => btnClick('Ans')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-amber-400 font-bold active:scale-95 transition"
            >
              Ans
            </button>
            <button
              onClick={() => btnClick('^(-1)')}
              className="py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 active:scale-95 transition"
            >
              1/x
            </button>
          </div>
        )}
      </div>

      {/* 4. Quick Access Row: Parentheses, Roots, Powers, Backspace */}
      <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#090d18] border-b border-slate-800/70 font-mono text-sm">
        <button
          onClick={() => btnClick('(')}
          className="py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 active:scale-95 transition"
        >
          (
        </button>
        <button
          onClick={() => btnClick(')')}
          className="py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 active:scale-95 transition"
        >
          )
        </button>
        <button
          onClick={() => btnClick('^')}
          className="py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 active:scale-95 transition"
        >
          ^
        </button>
        <button
          onClick={handleClear}
          className="py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 font-bold border border-rose-800/50 active:scale-95 transition"
        >
          AC
        </button>
        <button
          onClick={handleBackspace}
          className="py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 active:scale-95 transition"
        >
          <Delete className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* 5. Main Calculator Numeric Keypad */}
      <div className="flex-1 p-2 grid grid-cols-4 gap-2 bg-[#080c16]">
        {/* Row 1 */}
        <button
          onClick={() => btnClick('7')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          7
        </button>
        <button
          onClick={() => btnClick('8')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          8
        </button>
        <button
          onClick={() => btnClick('9')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          9
        </button>
        <button
          onClick={() => btnClick('÷', 'action')}
          className="h-14 sm:h-16 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-mono text-2xl font-bold border border-indigo-800/40 shadow active:scale-95 transition"
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          onClick={() => btnClick('4')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          4
        </button>
        <button
          onClick={() => btnClick('5')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          5
        </button>
        <button
          onClick={() => btnClick('6')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          6
        </button>
        <button
          onClick={() => btnClick('×', 'action')}
          className="h-14 sm:h-16 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-mono text-2xl font-bold border border-indigo-800/40 shadow active:scale-95 transition"
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          onClick={() => btnClick('1')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          1
        </button>
        <button
          onClick={() => btnClick('2')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          2
        </button>
        <button
          onClick={() => btnClick('3')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          3
        </button>
        <button
          onClick={() => btnClick('−', 'action')}
          className="h-14 sm:h-16 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-mono text-2xl font-bold border border-indigo-800/40 shadow active:scale-95 transition"
        >
          −
        </button>

        {/* Row 4 */}
        <button
          onClick={() => btnClick('.')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          .
        </button>
        <button
          onClick={() => btnClick('0')}
          className="h-14 sm:h-16 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 font-mono text-2xl font-bold border border-slate-800 shadow active:scale-95 transition"
        >
          0
        </button>
        <button
          onClick={handleEquals}
          className="h-14 sm:h-16 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-mono text-3xl font-extrabold shadow-lg shadow-indigo-950/50 active:scale-95 transition"
        >
          =
        </button>
        <button
          onClick={() => btnClick('+', 'action')}
          className="h-14 sm:h-16 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-mono text-2xl font-bold border border-indigo-800/40 shadow active:scale-95 transition"
        >
          +
        </button>
      </div>
    </div>
  );
};
