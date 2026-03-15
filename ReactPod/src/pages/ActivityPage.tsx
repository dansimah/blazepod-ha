import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { podManager } from "../ble/manager";
import { runRandomActivity } from "../activities/random";
import { runCompetition } from "../activities/competition";
import LiveStats from "../components/LiveStats";
import type { Preset, ActivityResult } from "../activities/types";
import type { CompetitionResult } from "../activities/competition";

type Phase = "countdown" | "playing" | "done";

export default function ActivityPage() {
  const [searchParams] = useSearchParams();
  const presetId = searchParams.get("presetId");
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [remaining, setRemaining] = useState(0);
  const [hits, setHits] = useState(0);
  const [lastReaction, setLastReaction] = useState<number | null>(null);
  const [lastColor, setLastColor] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!presetId) {
      setError("Missing presetId");
      setLoading(false);
      return;
    }
    fetch("/api/presets")
      .then((r) => r.json())
      .then((data: Array<Record<string, unknown>>) => {
        const list = Array.isArray(data) ? data : [];
        const raw = list.find(
          (x) => String(x.id) === presetId || x.id === Number(presetId)
        );
        if (raw) {
          setPreset({
            id: raw.id as number,
            name: (raw.name as string) ?? "",
            mode: (raw.mode as "random" | "competition") ?? "random",
            numPods: Number(raw.num_pods) || 1,
            colors: Array.isArray(raw.colors) ? (raw.colors as string[]) : [],
            durationSec: Number(raw.duration_sec) || 60,
            cycles: Number(raw.cycles) || 1,
            restSec: Number(raw.rest_sec) ?? 10,
          });
        } else {
          setError("Preset not found");
        }
      })
      .catch(() => setError("Failed to load preset"))
      .finally(() => setLoading(false));
  }, [presetId]);

  const runActivity = useCallback(async () => {
    if (!preset || !presetId) return;
    const pods = podManager.connectedPods;
    if (pods.length === 0) {
      setError("No pods connected. Add pods first.");
      return;
    }

    setPhase("playing");
    setHits(0);
    setLastReaction(null);
    setLastColor(null);
    setRemaining(preset.durationSec);
    setError(null);
    abortRef.current = new AbortController();

    const onHit = (player: number, event: { reactionMs: number; color: string }) => {
      setHits((prev) => prev + 1);
      setLastReaction(event.reactionMs);
      setLastColor(event.color);
    };
    const onHitSingle = (event: { reactionMs: number; color: string }) => {
      setHits((prev) => prev + 1);
      setLastReaction(event.reactionMs);
      setLastColor(event.color);
    };
    const onTick = (r: number) => setRemaining(r);

    try {
      if (preset.mode === "competition") {
        const half = Math.floor(pods.length / 2);
        const player1Pods = pods.slice(0, half);
        const player2Pods = pods.slice(half);
        if (player1Pods.length === 0 || player2Pods.length === 0) {
          setError("Need at least 2 pods for competition");
          setPhase("done");
          return;
        }
        const result = await runCompetition({
          player1Pods,
          player2Pods,
          colors: preset.colors,
          durationSec: preset.durationSec,
          onHit,
          onTick,
          signal: abortRef.current.signal,
        });
        setPhase("done");
        navigate("/results", {
          state: {
            result,
            presetId: preset.id ?? Number(presetId),
            presetName: preset.name,
          },
        });
      } else {
        const result = await runRandomActivity({
          pods,
          colors: preset.colors,
          durationSec: preset.durationSec,
          onHit: onHitSingle,
          onTick,
          signal: abortRef.current.signal,
        });
        setPhase("done");
        navigate("/results", {
          state: {
            result,
            presetId: preset.id ?? Number(presetId),
            presetName: preset.name,
          },
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Activity failed");
      }
      setPhase("done");
    }
  }, [preset, presetId, navigate]);

  useEffect(() => {
    if (!preset || loading) return;

    let count = 3;
    setPhase("countdown");
    setRemaining(3);

    let goTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const iv = setInterval(() => {
      count--;
      setRemaining(count);
      if (count === 0) {
        clearInterval(iv);
        goTimeoutId = setTimeout(() => runActivity(), 500);
      }
    }, 1000);
    return () => {
      clearInterval(iv);
      if (goTimeoutId != null) clearTimeout(goTimeoutId);
    };
  }, [preset?.id, loading]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-400">Loading preset…</p>
      </div>
    );
  }

  if (error && !preset) {
    return (
      <div className="p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const countdownText =
    remaining === 3 ? "3" : remaining === 2 ? "2" : remaining === 1 ? "1" : "GO!";

  return (
    <div className="p-6 flex flex-col items-center min-h-[60vh]">
      {phase === "countdown" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-7xl font-bold text-cyan-400 animate-pulse">
            {countdownText}
          </p>
        </div>
      )}

      {phase === "playing" && (
        <>
          <LiveStats
            hits={hits}
            remaining={remaining}
            lastReaction={lastReaction}
            lastColor={lastColor}
          />
          <button
            onClick={handleStop}
            className="mt-8 px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-medium"
          >
            Stop
          </button>
        </>
      )}

      {error && phase === "playing" && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
