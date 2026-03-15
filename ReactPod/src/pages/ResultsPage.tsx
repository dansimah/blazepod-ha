import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import type { ActivityResult } from "../activities/types";
import type { CompetitionResult } from "../activities/competition";

interface ResultsState {
  result: ActivityResult | CompetitionResult;
  presetId?: number;
  presetName?: string;
}

function ResultCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 text-center">
      <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-4xl font-bold tabular-nums text-cyan-400">{value}</p>
      {sub != null && <p className="text-slate-500 text-sm mt-1">{sub}</p>}
    </div>
  );
}

function SingleResultView({ r }: { r: ActivityResult }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ResultCard label="Hits" value={r.hits} />
      <ResultCard
        label="Duration"
        value={`${Math.floor(r.durationSec / 60)}:${(r.durationSec % 60)
          .toString()
          .padStart(2, "0")}`}
      />
      <ResultCard
        label="Avg reaction"
        value={r.reactionTimes?.length ? `${r.avgMs.toFixed(0)} ms` : "—"}
      />
      <ResultCard
        label="Min"
        value={r.reactionTimes?.length ? `${r.minMs.toFixed(0)} ms` : "—"}
      />
      <ResultCard
        label="Max"
        value={r.reactionTimes?.length ? `${r.maxMs.toFixed(0)} ms` : "—"}
      />
    </div>
  );
}

export default function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const data = state as ResultsState | null;

  if (!data?.result) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <p className="text-slate-400">No results to show.</p>
        <Link to="/" className="text-cyan-400 hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const { result, presetId, presetName } = data;
  const isCompetition = "player1" in result && "player2" in result;
  const compResult = result as CompetitionResult;

  function toApiPayload(r: ActivityResult) {
    return {
      preset_id: presetId,
      preset_name: presetName ?? r.presetName,
      mode: r.mode,
      player: r.player,
      duration_sec: r.durationSec,
      hits: r.hits,
      avg_ms: r.avgMs,
      min_ms: r.minMs,
      max_ms: r.maxMs,
      reaction_times: r.reactionTimes,
    };
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = isCompetition
        ? [compResult.player1, compResult.player2]
        : [result as ActivityResult];
      for (const entry of entries) {
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toApiPayload(entry)),
        });
      }
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handlePlayAgain = () => {
    navigate(`/activity?presetId=${presetId ?? ""}`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">
        {presetName ?? "Results"}
      </h1>

      {isCompetition ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-slate-400 text-sm uppercase mb-3">Player 1</h2>
            <SingleResultView r={compResult.player1} />
          </div>
          <div>
            <h2 className="text-slate-400 text-sm uppercase mb-3">Player 2</h2>
            <SingleResultView r={compResult.player2} />
          </div>
        </div>
      ) : (
        <SingleResultView r={result as ActivityResult} />
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 font-medium"
        >
          {saved ? "Saved" : saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handlePlayAgain}
          className="w-full py-3 rounded-xl bg-slate-600 hover:bg-slate-500 font-medium"
        >
          Play Again
        </button>
        <Link
          to="/"
          className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-medium text-center"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
