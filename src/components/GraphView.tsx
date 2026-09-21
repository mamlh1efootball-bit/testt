import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Camera,
  Layers,
  Table as TableIcon,
  HelpCircle,
} from 'lucide-react';
import { GraphFunction, GraphRange, AngleMode } from '../types';
import { compileGraphFunction } from '../utils/mathEngine';
import { soundHaptic } from '../utils/audioHaptics';

interface Props {
  angleMode: AngleMode;
}

const PRESET_FUNCTIONS = [
  {
    name: 'موج میرای فیزیک (Damped Wave)',
    expr: 'exp(-0.25*x) * cos(4*x)',
  },
  {
    name: 'توزیع نرمال گوس (Gaussian Bell)',
    expr: 'exp(-x^2 / 2) / sqrt(2*pi)',
  },
  {
    name: 'تقریب فوریه موج مربعی (Fourier Series)',
    expr: 'sin(x) + sin(3*x)/3 + sin(5*x)/5',
  },
  {
    name: 'چندجمله‌ای با ریشه‌های متعدد (Polynomial)',
    expr: '0.1 * (x + 4) * (x + 1) * (x - 2) * (x - 5)',
  },
  {
    name: 'تداخل دو موج همساز (Beat Frequency)',
    expr: 'sin(5*x) + sin(6*x)',
  },
  {
    name: 'تابع کاردیوئید / موج سینوسی خاص',
    expr: 'sin(x) * sqrt(abs(cos(x))) / (sin(x) + 7/5) - 2*sin(x) + 2',
  },
];

const DEFAULT_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#34d399', '#fbbf24'];

export const GraphView: React.FC<Props> = ({ angleMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [functions, setFunctions] = useState<GraphFunction[]>([
    {
      id: '1',
      name: 'f₁(x)',
      expression: 'sin(x) * x / 2',
      color: '#38bdf8',
      visible: true,
      isValid: true,
    },
    {
      id: '2',
      name: 'f₂(x)',
      expression: 'cos(x)',
      color: '#f43f5e',
      visible: true,
      isValid: true,
    },
  ]);

  const [activeFuncId, setActiveFuncId] = useState<string>('1');
  const [range, setRange] = useState<GraphRange>({
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6,
  });

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showRoots, setShowRoots] = useState(true);

  // Responsive canvas size
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasDimensions({
          width: Math.max(320, rect.width),
          height: Math.max(280, rect.height),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Find roots (zero crossings) in view
  const calculateRoots = useCallback(
    (evalFn: (x: number) => number, xMin: number, xMax: number) => {
      const roots: { x: number; y: number }[] = [];
      const steps = 300;
      const dx = (xMax - xMin) / steps;
      let prevY = evalFn(xMin);

      for (let i = 1; i <= steps; i++) {
        const x = xMin + i * dx;
        const y = evalFn(x);
        if (!isNaN(prevY) && !isNaN(y)) {
          if ((prevY <= 0 && y >= 0) || (prevY >= 0 && y <= 0)) {
            // Linear interpolation for approximate root
            const rootX = x - dx * (y / (y - prevY));
            if (isFinite(rootX) && Math.abs(evalFn(rootX)) < 0.2) {
              roots.push({ x: rootX, y: 0 });
            }
          }
        }
        prevY = y;
      }
      return roots;
    },
    []
  );

  // Main Canvas Render
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Coordinate transformation functions
    const toCanvasX = (mathX: number) => ((mathX - range.xMin) / (range.xMax - range.xMin)) * width;
    const toCanvasY = (mathY: number) => height - ((mathY - range.yMin) / (range.yMax - range.yMin)) * height;
    const toMathX = (cx: number) => range.xMin + (cx / width) * (range.xMax - range.xMin);
    const toMathY = (cy: number) => range.yMin + ((height - cy) / height) * (range.yMax - range.yMin);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(1, '#060913');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Grid Lines
    const xSpan = range.xMax - range.xMin;
    const ySpan = range.yMax - range.yMin;

    // Determine grid step
    const getGridStep = (span: number) => {
      const raw = span / 10;
      const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
      const norm = raw / magnitude;
      if (norm < 1.5) return magnitude;
      if (norm < 3.5) return 2 * magnitude;
      if (norm < 7.5) return 5 * magnitude;
      return 10 * magnitude;
    };

    const xGridStep = getGridStep(xSpan);
    const yGridStep = getGridStep(ySpan);

    // Minor Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = Math.floor(range.xMin / xGridStep) * xGridStep;
    for (let x = startX; x <= range.xMax; x += xGridStep) {
      const cx = toCanvasX(x);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
    }

    const startY = Math.floor(range.yMin / yGridStep) * yGridStep;
    for (let y = startY; y <= range.yMax; y += yGridStep) {
      const cy = toCanvasY(y);
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
    }
    ctx.stroke();

    // 2. Axes X and Y
    const originX = toCanvasX(0);
    const originY = toCanvasY(0);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // X axis
    if (originY >= 0 && originY <= height) {
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
    }
    // Y axis
    if (originX >= 0 && originX <= width) {
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
    }
    ctx.stroke();

    // Axis Labels Numbers
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let x = startX; x <= range.xMax; x += xGridStep) {
      if (Math.abs(x) < 1e-9) continue;
      const cx = toCanvasX(x);
      const labelY = Math.min(Math.max(originY + 4, 15), height - 20);
      ctx.fillText(Number(x.toPrecision(4)).toString(), cx, labelY);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = startY; y <= range.yMax; y += yGridStep) {
      if (Math.abs(y) < 1e-9) continue;
      const cy = toCanvasY(y);
      const labelX = Math.min(Math.max(originX - 6, 40), width - 10);
      ctx.fillText(Number(y.toPrecision(4)).toString(), labelX, cy);
    }

    // 3. Plot Functions
    functions.forEach((fn) => {
      if (!fn.visible || !fn.expression.trim()) return;

      const compiled = compileGraphFunction(fn.expression, angleMode);
      if (!compiled.isValid) return;

      ctx.save();
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = fn.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      let started = false;
      const sampleCount = Math.max(width * 1.5, 800);
      const dx = xSpan / sampleCount;

      for (let i = 0; i <= sampleCount; i++) {
        const mathX = range.xMin + i * dx;
        const mathY = compiled.evaluate(mathX);

        if (isNaN(mathY) || !isFinite(mathY)) {
          started = false;
          continue;
        }

        const cx = toCanvasX(mathX);
        const cy = toCanvasY(mathY);

        // Avoid drawing vertical lines across asymptotes (like tan)
        if (cy < -height * 2 || cy > height * 3) {
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(cx, cy);
          started = true;
        } else {
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Plot Roots if enabled
      if (showRoots) {
        const roots = calculateRoots(compiled.evaluate, range.xMin, range.xMax);
        roots.forEach((root) => {
          const rx = toCanvasX(root.x);
          const ry = toCanvasY(0);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    });

    // 4. Cursor / Trace Crosshair
    if (cursorPos) {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, 0);
      ctx.lineTo(cursorPos.x, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, cursorPos.y);
      ctx.lineTo(width, cursorPos.y);
      ctx.stroke();

      // Coordinate badge
      const mX = toMathX(cursorPos.x);
      const mY = toMathY(cursorPos.y);
      const coordText = `(${mX.toFixed(2)}, ${mY.toFixed(2)})`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      const textWidth = ctx.measureText(coordText).width;
      const boxX = Math.min(cursorPos.x + 10, width - textWidth - 25);
      const boxY = Math.max(cursorPos.y - 30, 25);

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, textWidth + 16, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordText, boxX + 8, boxY + 11);

      ctx.restore();
    }
  }, [canvasDimensions, functions, range, angleMode, cursorPos, showRoots, calculateRoots]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Mouse & Touch Pan Handling
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    setCursorPos({ x: cx, y: cy });

    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      const xSpan = range.xMax - range.xMin;
      const ySpan = range.yMax - range.yMin;

      const deltaMathX = (dx / canvasDimensions.width) * xSpan;
      const deltaMathY = (dy / canvasDimensions.height) * ySpan;

      setRange((prev) => ({
        xMin: prev.xMin - deltaMathX,
        xMax: prev.xMax - deltaMathX,
        yMin: prev.yMin + deltaMathY,
        yMax: prev.yMax + deltaMathY,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handlePointerLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setCursorPos(null);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
    zoom(zoomFactor);
  };

  const zoom = (factor: number) => {
    soundHaptic.triggerKeyFeedback('tap');
    setRange((prev) => {
      const xCenter = (prev.xMin + prev.xMax) / 2;
      const yCenter = (prev.yMin + prev.yMax) / 2;
      const xHalf = ((prev.xMax - prev.xMin) * factor) / 2;
      const yHalf = ((prev.yMax - prev.yMin) * factor) / 2;

      return {
        xMin: xCenter - xHalf,
        xMax: xCenter + xHalf,
        yMin: yCenter - yHalf,
        yMax: yCenter + yHalf,
      };
    });
  };

  const resetView = () => {
    soundHaptic.triggerKeyFeedback('action');
    setRange({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
  };

  // Add new function
  const addFunction = () => {
    soundHaptic.triggerKeyFeedback('action');
    if (functions.length >= 5) return;
    const nextIndex = functions.length + 1;
    const color = DEFAULT_COLORS[functions.length % DEFAULT_COLORS.length];
    const newFn: GraphFunction = {
      id: String(Date.now()),
      name: `f${nextIndex}(x)`,
      expression: '',
      color,
      visible: true,
      isValid: true,
    };
    setFunctions([...functions, newFn]);
    setActiveFuncId(newFn.id);
  };

  const updateFunctionExpr = (id: string, expr: string) => {
    setFunctions((prev) =>
      prev.map((fn) => {
        if (fn.id === id) {
          const comp = compileGraphFunction(expr, angleMode);
          return {
            ...fn,
            expression: expr,
            isValid: comp.isValid,
            error: comp.error,
          };
        }
        return fn;
      })
    );
  };

  const removeFunction = (id: string) => {
    soundHaptic.triggerKeyFeedback('action');
    if (functions.length <= 1) return;
    setFunctions((prev) => prev.filter((fn) => fn.id !== id));
  };

  const toggleVisibility = (id: string) => {
    soundHaptic.triggerKeyFeedback('tap');
    setFunctions((prev) =>
      prev.map((fn) => (fn.id === id ? { ...fn, visible: !fn.visible } : fn))
    );
  };

  // Export Graph Screenshot as PNG
  const exportImage = () => {
    soundHaptic.triggerKeyFeedback('equals');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = `ApexCalc-Graph-${Date.now()}.png`;
    a.click();
  };

  // Quick math insert into active function
  const insertToken = (token: string) => {
    soundHaptic.triggerKeyFeedback('tap');
    const current = functions.find((f) => f.id === activeFuncId);
    if (current) {
      updateFunctionExpr(current.id, current.expression + token);
    }
  };

  return (
    <div id="graph-view-container" className="flex flex-col h-full bg-[#080c16] select-none">
      {/* 1. Interactive Canvas Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[260px] bg-[#070b14] overflow-hidden cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onWheel={handleWheel}
          className="w-full h-full block touch-none"
        />

        {/* Floating Controls Overlay (Zoom & Tools) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => zoom(0.8)}
            className="p-2 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700/80 text-slate-200 hover:text-white shadow-lg active:scale-95 transition"
            title="بزرگنمایی"
          >
            <ZoomIn className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={() => zoom(1.25)}
            className="p-2 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700/80 text-slate-200 hover:text-white shadow-lg active:scale-95 transition"
            title="کوچکنمایی"
          >
            <ZoomOut className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700/80 text-slate-200 hover:text-white shadow-lg active:scale-95 transition"
            title="بازنشانی مختصات پیش‌فرض"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={exportImage}
            className="p-2 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700/80 text-slate-200 hover:text-white shadow-lg active:scale-95 transition"
            title="ذخیره تصویر نمودار (PNG)"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Floating Toggle: Presets & Table & Roots */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={() => setShowRoots(!showRoots)}
            className={`px-2 py-1 text-xs font-medium rounded-lg border backdrop-blur transition-all ${
              showRoots
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}
            title="نمایش نقاط ریشه (Roots)"
          >
            نقاط ریشه
          </button>
          <button
            onClick={() => {
              setShowPresets(!showPresets);
              setShowTable(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/80 text-sky-300 hover:bg-slate-800 flex items-center gap-1 shadow-lg transition"
          >
            <Layers className="w-3.5 h-3.5" />
            نمودارهای آماده
          </button>
          <button
            onClick={() => {
              setShowTable(!showTable);
              setShowPresets(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/80 text-purple-300 hover:bg-slate-800 flex items-center gap-1 shadow-lg transition"
          >
            <TableIcon className="w-3.5 h-3.5" />
            جدول مقادیر
          </button>
        </div>

        {/* Preset Functions Dropdown Sheet */}
        {showPresets && (
          <div className="absolute inset-x-3 top-14 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-300 font-bold">
              <span>توابع و نمودارهای پیچیده آماده:</span>
              <button
                onClick={() => setShowPresets(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {PRESET_FUNCTIONS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundHaptic.triggerKeyFeedback('action');
                    const target = functions.find((f) => f.id === activeFuncId) || functions[0];
                    updateFunctionExpr(target.id, p.expr);
                    setShowPresets(false);
                  }}
                  className="text-right p-2 rounded-xl bg-slate-800/70 hover:bg-indigo-950/60 border border-slate-700/60 hover:border-indigo-500/60 transition flex flex-col"
                >
                  <span className="text-xs font-semibold text-sky-300">{p.name}</span>
                  <span className="text-[11px] font-mono text-slate-400 dir-ltr text-left">
                    {p.expr}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table of Values Modal / Overlay */}
        {showTable && (
          <div className="absolute inset-x-3 top-14 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-20 max-h-64 overflow-hidden flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-300 font-bold">
              <span>جدول مقادیر x و y تابع فعال:</span>
              <button onClick={() => setShowTable(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-1">x</th>
                    <th className="py-1">y = f(x)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const xVal = -7 + i;
                    const activeFn = functions.find((f) => f.id === activeFuncId) || functions[0];
                    const comp = compileGraphFunction(activeFn.expression, angleMode);
                    const yVal = comp.evaluate(xVal);
                    return (
                      <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                        <td className="py-1 text-slate-300">{xVal}</td>
                        <td className="py-1 text-sky-400 font-semibold">
                          {isNaN(yVal) ? 'تعریف نشده' : yVal.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. Function Quick Expression Tokens Bar */}
      <div className="px-2 py-1.5 bg-[#090d19] border-t border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs">
        {['x', '+', '−', '×', '÷', '^', 'sin(', 'cos(', 'tan(', 'ln(', 'exp(', 'sqrt(', 'abs(', 'pi'].map(
          (tok) => (
            <button
              key={tok}
              onClick={() => insertToken(tok)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700/60 active:scale-95 transition"
            >
              {tok}
            </button>
          )
        )}
      </div>

      {/* 3. Multi-Function Management List */}
      <div className="p-3 bg-[#080c16] flex flex-col gap-2 max-h-[170px] overflow-y-auto">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">لیست توابع نمودار (f(x)):</span>
          {functions.length < 5 && (
            <button
              onClick={addFunction}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن تابع جدید</span>
            </button>
          )}
        </div>

        {functions.map((fn) => (
          <div
            key={fn.id}
            onClick={() => setActiveFuncId(fn.id)}
            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
              activeFuncId === fn.id
                ? 'bg-slate-800/90 border-sky-500/70 shadow-sm'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Color Dot Indicator */}
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: fn.color }}
            />

            {/* Function Name Badge */}
            <span className="text-xs font-mono font-bold text-slate-300 w-10 shrink-0">
              {fn.name} =
            </span>

            {/* Input Expression Box */}
            <input
              type="text"
              dir="ltr"
              value={fn.expression}
              onChange={(e) => updateFunctionExpr(fn.id, e.target.value)}
              placeholder="مثال: sin(x) * x"
              className="flex-1 bg-transparent text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none px-1"
            />

            {/* Visibility Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(fn.id);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 transition"
              title={fn.visible ? 'پنهان کردن' : 'نمایش دادن'}
            >
              {fn.visible ? (
                <Eye className="w-4 h-4 text-sky-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Delete button (if >1) */}
            {functions.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFunction(fn.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-400 transition"
                title="حذف تابع"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
