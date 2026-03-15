import { COLOR_HEX } from "../activities/types";

interface LiveStatsProps {
  hits: number;
  remaining: number;
  lastReaction: number | null;
  lastColor: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function LiveStats({
  hits,
  remaining,
  lastReaction,
  lastColor,
}: LiveStatsProps) {
  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <div className="text-6xl font-bold tabular-nums text-cyan-400">
        {formatTime(remaining)}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-slate-400 text-sm uppercase tracking-wider">Hits</span>
        <span className="text-5xl font-bold tabular-nums">{hits}</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-slate-400 text-sm uppercase tracking-wider">
          Last reaction
        </span>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tabular-nums">
            {lastReaction != null ? `${lastReaction} ms` : "—"}
          </span>
          {lastColor && (
            <span
              className="w-6 h-6 rounded-full ring-2 ring-slate-600"
              style={{ backgroundColor: COLOR_HEX[lastColor] ?? "#fff" }}
              title={lastColor}
            />
          )}
        </div>
      </div>
    </div>
  );
}
