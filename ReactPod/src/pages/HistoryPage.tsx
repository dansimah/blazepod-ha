import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface HistoryEntryApi {
  id?: number;
  preset_name: string;
  mode: string;
  date: string;
  hits: number;
  avg_ms: number;
  min_ms?: number;
  max_ms?: number;
  reaction_times?: number[];
  duration_sec?: number;
  player?: number;
}

interface HistoryEntry {
  id?: number;
  presetName: string;
  mode: string;
  date: string;
  hits: number;
  avgMs: number;
  minMs?: number;
  maxMs?: number;
  reactionTimes?: number[];
  durationSec?: number;
  player?: number;
}

function toHistoryEntry(raw: HistoryEntryApi): HistoryEntry {
  return {
    id: raw.id,
    presetName: raw.preset_name,
    mode: raw.mode,
    date: raw.date,
    hits: raw.hits,
    avgMs: raw.avg_ms ?? 0,
    minMs: raw.min_ms,
    maxMs: raw.max_ms,
    reactionTimes: raw.reaction_times,
    durationSec: raw.duration_sec,
    player: raw.player,
  };
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data: HistoryEntryApi[]) => {
        const list = Array.isArray(data) ? data.map(toHistoryEntry) : [];
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(list);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (e: HistoryEntry) => {
    const key = e.id ?? e.date;
    setExpandedId((prev) => (prev === key ? null : key));
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      {loading ? (
        <p className="text-slate-400 text-center py-8">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <p className="text-slate-400">No history yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const key = e.id ?? e.date;
            const isExpanded = expandedId === key;
            return (
              <li key={key} className="bg-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(e)}
                  className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.presetName}</p>
                    <p className="text-slate-500 text-sm">
                      {formatDate(e.date)} · {e.hits} hits · {e.avgMs.toFixed(0)} ms avg
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs ${
                      e.mode === "competition"
                        ? "bg-cyan-900/50 text-cyan-300"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {e.mode}
                  </span>
                  <span className="text-slate-500">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700">
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {e.durationSec != null && (
                        <div>
                          <span className="text-slate-500">Duration:</span>{" "}
                          {Math.floor(e.durationSec / 60)}:
                          {(e.durationSec % 60).toString().padStart(2, "0")}
                        </div>
                      )}
                      {e.minMs != null && (
                        <div>
                          <span className="text-slate-500">Min:</span> {e.minMs.toFixed(0)} ms
                        </div>
                      )}
                      {e.maxMs != null && (
                        <div>
                          <span className="text-slate-500">Max:</span> {e.maxMs.toFixed(0)} ms
                        </div>
                      )}
                      {e.player != null && (
                        <div>
                          <span className="text-slate-500">Player:</span> {e.player}
                        </div>
                      )}
                    </div>
                    {e.reactionTimes && e.reactionTimes.length > 0 && (
                      <p className="mt-2 text-slate-500 text-xs">
                        Times: {e.reactionTimes.map((t) => t.toFixed(0)).join(", ")} ms
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
