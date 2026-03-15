export interface Preset {
  id?: number;
  name: string;
  mode: "random" | "competition";
  numPods: number;
  podsPerPlayer?: number;
  colors: string[];
  durationSec: number;
  cycles: number;
  restSec: number;
}

export interface HitEvent {
  hitNumber: number;
  podId: string;
  reactionMs: number;
  color: string;
  timestamp: number;
}

export interface ActivityResult {
  presetId?: number;
  presetName: string;
  mode: string;
  player?: number;
  durationSec: number;
  hits: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  reactionTimes: number[];
  date: string;
}

export const NAMED_COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  white: [255, 255, 255],
};

export const COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  white: "#f8fafc",
};
