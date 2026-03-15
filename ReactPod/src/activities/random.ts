import { BlazePodDevice } from "../ble/device";
import { NAMED_COLORS, ActivityResult, HitEvent } from "./types";

export interface RandomActivityConfig {
  pods: BlazePodDevice[];
  colors: string[];
  durationSec: number;
  onHit?: (event: HitEvent) => void;
  onTick?: (remainingSec: number) => void;
  signal?: AbortSignal;
}

export async function runRandomActivity(config: RandomActivityConfig): Promise<ActivityResult> {
  const { pods, colors, durationSec, onHit, onTick, signal } = config;
  if (pods.length === 0) throw new Error("Need at least one pod");

  const colorValues = colors.map((c) => NAMED_COLORS[c] ?? [255, 255, 255]);
  const reactionTimes: number[] = [];
  let hits = 0;
  let lastPodIdx = -1;
  let running = true;
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  // Tick timer
  const tickInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    onTick?.(remaining);
    if (remaining <= 0) running = false;
  }, 250);

  try {
    while (running && Date.now() < endTime && !signal?.aborted) {
      const remaining = endTime - Date.now();
      if (remaining <= 0) break;

      // Pick random pod (avoid same twice in a row)
      let podIdx: number;
      if (pods.length > 1) {
        do { podIdx = Math.floor(Math.random() * pods.length); } while (podIdx === lastPodIdx);
      } else {
        podIdx = 0;
      }
      lastPodIdx = podIdx;
      const pod = pods[podIdx];

      // Pick random color
      const colorIdx = Math.floor(Math.random() * colorValues.length);
      const [r, g, b] = colorValues[colorIdx];
      const colorName = colors[colorIdx];

      // Light up with tap-off
      await pod.setColor(r, g, b, true);

      // Wait for tap
      const tap = await pod.waitForTap(remaining);
      if (!tap) {
        await pod.turnOff().catch(() => {});
        break;
      }

      hits++;
      reactionTimes.push(tap.elapsedMs);
      onHit?.({
        hitNumber: hits,
        podId: pod.id,
        reactionMs: tap.elapsedMs,
        color: colorName,
        timestamp: Date.now(),
      });
    }
  } finally {
    clearInterval(tickInterval);
    for (const pod of pods) {
      await pod.turnOff().catch(() => {});
    }
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  return {
    presetName: "",
    mode: "random",
    durationSec: actualDuration,
    hits,
    avgMs: reactionTimes.length ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0,
    minMs: reactionTimes.length ? Math.min(...reactionTimes) : 0,
    maxMs: reactionTimes.length ? Math.max(...reactionTimes) : 0,
    reactionTimes,
    date: new Date().toISOString(),
  };
}
