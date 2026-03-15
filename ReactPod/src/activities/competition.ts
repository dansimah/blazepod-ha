import { BlazePodDevice } from "../ble/device";
import { ActivityResult, HitEvent } from "./types";
import { runRandomActivity } from "./random";

export interface CompetitionConfig {
  player1Pods: BlazePodDevice[];
  player2Pods: BlazePodDevice[];
  colors: string[];
  durationSec: number;
  onHit?: (player: number, event: HitEvent) => void;
  onTick?: (remainingSec: number) => void;
  signal?: AbortSignal;
}

export interface CompetitionResult {
  player1: ActivityResult;
  player2: ActivityResult;
}

export async function runCompetition(config: CompetitionConfig): Promise<CompetitionResult> {
  const { player1Pods, player2Pods, colors, durationSec, onHit, onTick, signal } = config;

  // Run both players simultaneously
  const [result1, result2] = await Promise.all([
    runRandomActivity({
      pods: player1Pods,
      colors,
      durationSec,
      onHit: onHit ? (e) => onHit(1, e) : undefined,
      onTick,
      signal,
    }),
    runRandomActivity({
      pods: player2Pods,
      colors,
      durationSec,
      onHit: onHit ? (e) => onHit(2, e) : undefined,
      signal,
    }),
  ]);

  return {
    player1: { ...result1, player: 1 },
    player2: { ...result2, player: 2 },
  };
}
