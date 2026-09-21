import * as math from 'mathjs';
import { AngleMode } from '../types';

// Pre-sanitize mathematical expression for human typing
export function sanitizeExpression(expr: string): string {
  let cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/φ/g, '1.618033988749895')
    .replace(/√\(/g, 'sqrt(')
    .replace(/√([0-9a-zA-Z.]+)/g, 'sqrt($1)')
    .replace(/ln\(/g, 'log(')
    .replace(/log10\(/g, 'log10(')
    .replace(/log2\(/g, 'log2(');

  // Auto-insert multiplication: e.g. 2x -> 2*x, 5( -> 5*(, )2 -> )*2, )sin -> )*sin, 3pi -> 3*pi
  cleaned = cleaned.replace(/(\d)(\s*)([a-zA-Z(])/g, '$1*$3');
  cleaned = cleaned.replace(/(\))(\s*)(\d|[a-zA-Z(])/g, '$1*$3');

  return cleaned;
}

// Create custom scope with trigonometry adjusted for DEG/RAD
export function evaluateExpression(
  rawExpr: string,
  angleMode: AngleMode = 'RAD',
  ansValue: number | string = 0
): { success: boolean; result: string; numericValue?: number; error?: string } {
  if (!rawExpr || !rawExpr.trim()) {
    return { success: false, result: '', error: 'عبارتی وارد نشده است' };
  }

  try {
    let sanitized = sanitizeExpression(rawExpr);
    // Replace Ans with previous value
    sanitized = sanitized.replace(/\bAns\b/gi, `(${ansValue})`);

    // Prepare custom math scope
    const scope: Record<string, any> = {
      Ans: ansValue,
      c: 299792458, // speed of light m/s
      G: 6.6743e-11, // gravitational constant
      h: 6.62607015e-34, // Planck constant
      phi: 1.618033988749895,
    };

    if (angleMode === 'DEG') {
      // Deg conversions
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;

      scope.sin = (x: number) => Math.sin(toRad(x));
      scope.cos = (x: number) => Math.cos(toRad(x));
      scope.tan = (x: number) => {
        const rad = toRad(x);
        // check for asymptote
        if (Math.abs(Math.cos(rad)) < 1e-12) return Infinity;
        return Math.tan(rad);
      };
      scope.cot = (x: number) => {
        const rad = toRad(x);
        const t = Math.tan(rad);
        return Math.abs(t) < 1e-12 ? Infinity : 1 / t;
      };
      scope.asin = (x: number) => toDeg(Math.asin(x));
      scope.acos = (x: number) => toDeg(Math.acos(x));
      scope.atan = (x: number) => toDeg(Math.atan(x));
    }

    const evalResult = math.evaluate(sanitized, scope);

    if (evalResult === undefined || evalResult === null) {
      return { success: false, result: '', error: 'خطا در محاسبه' };
    }

    // Format output nicely
    if (typeof evalResult === 'number') {
      if (isNaN(evalResult)) {
        return { success: false, result: 'تعریف نشده (NaN)', error: 'پاسخ عددی معتبر نیست' };
      }
      if (!isFinite(evalResult)) {
        return { success: true, result: evalResult > 0 ? '∞ (بی‌نهایت)' : '-∞ (منفی بی‌نهایت)', numericValue: evalResult };
      }
      // Clean up floating point precision issues (e.g. 0.30000000000000004 -> 0.3)
      const formatted = Number(evalResult.toPrecision(12)).toString();
      return { success: true, result: formatted, numericValue: evalResult };
    }

    if (math.isComplex(evalResult)) {
      const comp = evalResult as { re: number; im: number };
      const re = Number(comp.re.toPrecision(8));
      const im = Number(comp.im.toPrecision(8));
      const sign = im >= 0 ? '+' : '-';
      const formatted = `${re} ${sign} ${Math.abs(im)}i`;
      return { success: true, result: formatted };
    }

    return { success: true, result: String(evalResult) };
  } catch (err: any) {
    let msg = 'خطای نگارشی در فرمول';
    if (err?.message) {
      if (err.message.includes('Parenthesis')) msg = 'پرانتزها متوازن نیستند';
      else if (err.message.includes('Unexpected')) msg = 'علامت یا کاراکتر اشتباه در فرمول';
      else if (err.message.includes('Undefined')) msg = 'متغیر یا تابع ناشناخته';
    }
    return { success: false, result: '', error: msg };
  }
}

// Graph Function Compiler
export interface CompiledGraphFn {
  evaluate: (x: number) => number;
  isValid: boolean;
  error?: string;
}

export function compileGraphFunction(rawExpr: string, angleMode: AngleMode = 'RAD'): CompiledGraphFn {
  if (!rawExpr || !rawExpr.trim()) {
    return {
      evaluate: () => NaN,
      isValid: false,
      error: 'فرمول خالی است',
    };
  }

  try {
    const sanitized = sanitizeExpression(rawExpr);
    const compiled = math.compile(sanitized);

    // Warm up test with x=1
    const testScope: Record<string, any> = {
      x: 1,
      t: 1,
      theta: 1,
      pi: Math.PI,
      e: Math.E,
      phi: 1.618033988749895,
    };

    if (angleMode === 'DEG') {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      testScope.sin = (x: number) => Math.sin(toRad(x));
      testScope.cos = (x: number) => Math.cos(toRad(x));
      testScope.tan = (x: number) => Math.tan(toRad(x));
    }

    const testVal = compiled.evaluate(testScope);
    if (typeof testVal !== 'number' && !math.isComplex(testVal)) {
      return {
        evaluate: () => NaN,
        isValid: false,
        error: 'فرمول خروجی عددی تولید نمی‌کند',
      };
    }

    const scope: Record<string, any> = {
      x: 0,
      t: 0,
      theta: 0,
      pi: Math.PI,
      e: Math.E,
      phi: 1.618033988749895,
    };

    if (angleMode === 'DEG') {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      scope.sin = (v: number) => Math.sin(toRad(v));
      scope.cos = (v: number) => Math.cos(toRad(v));
      scope.tan = (v: number) => Math.tan(toRad(v));
    }

    return {
      evaluate: (val: number) => {
        try {
          scope.x = val;
          scope.t = val;
          scope.theta = val;
          const res = compiled.evaluate(scope);
          if (typeof res === 'number') {
            return isFinite(res) ? res : NaN;
          }
          return NaN;
        } catch {
          return NaN;
        }
      },
      isValid: true,
    };
  } catch (err: any) {
    return {
      evaluate: () => NaN,
      isValid: false,
      error: 'خطای نگارشی در ضابطه تابع',
    };
  }
}
