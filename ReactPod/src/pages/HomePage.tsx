import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PodConnector from "../components/PodConnector";
import { podManager } from "../ble/manager";
import { COLOR_HEX } from "../activities/types";

interface ApiPreset {
  id: number;
  name: string;
  mode: string;
  num_pods: number;
  colors: string[];
  duration_sec: number;
  cycles: number;
  rest_sec: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const hasWebBluetooth = typeof navigator !== "undefined" && !!navigator.bluetooth;

  useEffect(() => {
    let cancelled = false;
    async function fetchPresets() {
      try {
        const res = await fetch("/api/presets");
        if (!res.ok) throw new Error("Failed to fetch presets");
        const data = await res.json();
        if (!cancelled) setPresets(data);
      } catch (err) {
        if (!cancelled)
          setPresetsError(err instanceof Error ? err.message : "Failed to load presets");
      } finally {
        if (!cancelled) setPresetsLoading(false);
      }
    }
    fetchPresets();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 pb-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-white">ReactPod</h1>
        <p className="text-slate-400 text-sm mt-1">
          BlazePod fitness training via Web Bluetooth
        </p>
      </header>

      {/* Web Bluetooth check */}
      {!hasWebBluetooth && (
        <div className="bg-amber-900/50 border border-amber-700 rounded-xl p-4 text-amber-200 text-sm">
          Web Bluetooth is not available. Use a Chromium-based browser (Chrome, Edge) on
          HTTPS or localhost to connect to pods.
        </div>
      )}

      {/* Pod Connection */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Pod Connection</h2>
        <PodConnector />
      </section>

      {/* Select Preset */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Select Preset</h2>
        {presetsLoading ? (
          <p className="text-slate-400 text-sm">Loading presets…</p>
        ) : presetsError ? (
          <p className="text-red-400 text-sm">{presetsError}</p>
        ) : presets.length === 0 ? (
          <p className="text-slate-400 text-sm">No presets yet. Create one below.</p>
        ) : (
          <div className="grid gap-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => navigate(`/activity?presetId=${preset.id}`)}
                className="bg-slate-800 rounded-xl p-4 text-left hover:bg-slate-700/80 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{preset.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
                    {preset.mode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>{preset.duration_sec}s</span>
                  <span>{preset.num_pods} pod{preset.num_pods !== 1 ? "s" : ""}</span>
                  <div className="flex gap-1">
                    {(preset.colors ?? []).slice(0, 5).map((c) => (
                      <span
                        key={c}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLOR_HEX[c] ?? "#64748b" }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Create Preset link */}
      <Link
        to="/presets?new=true"
        className="fixed bottom-20 right-4 bg-sky-600 hover:bg-sky-500 text-white rounded-full px-5 py-3 shadow-lg font-medium text-sm transition-colors z-10"
      >
        Create Preset
      </Link>
    </div>
  );
}
