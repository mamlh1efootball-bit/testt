export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  isFavorite?: boolean;
  notes?: string;
}

export interface GraphFunction {
  id: string;
  name: string;
  expression: string;
  color: string;
  visible: boolean;
  isValid: boolean;
  error?: string;
  type?: 'cartesian' | 'polar' | 'parametric';
  paramY?: string; // for parametric y(t)
}

export interface GraphRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type AngleMode = 'DEG' | 'RAD';
export type AppTab = 'calculator' | 'graph' | 'history' | 'apk';
