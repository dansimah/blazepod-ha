import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ColorPicker from "../components/ColorPicker";
import type { Preset } from "../activities/types";

export default function PresetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const editId = searchParams.get("edit");

  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Preset>>({
    name: "",
    mode: "random",
    numPods: 2,
    podsPerPlayer: 1,
    colors: ["red", "green", "blue"],
    durationSec: 60,
    cycles: 1,
    restSec: 10,
  });

  function toPreset(r: Record<string, unknown>): Preset {
    return {
      id: r.id as number,
      name: (r.name as string) ?? "",
      mode: (r.mode as "random" | "competition") ?? "random",
      numPods: Number(r.num_pods) || 1,
      podsPerPlayer: r.pods_per_player != null ? Number(r.pods_per_player) : undefined,
      colors: Array.isArray(r.colors) ? (r.colors as string[]) : [],
      durationSec: Number(r.duration_sec) || 60,
      cycles: Number(r.cycles) || 1,
      restSec: Number(r.rest_sec) ?? 10,
    };
  }

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((data) => setPresets(Array.isArray(data) ? data.map(toPreset) : []))
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editId) {
      const id = parseInt(editId, 10);
      const p = presets.find((x) => x.id === id || Number(x.id) === id);
      if (p) setForm(p);
    } else if (!isNew) {
      setForm({
        name: "",
        mode: "random",
        numPods: 2,
        podsPerPlayer: 1,
        colors: ["red", "green", "blue"],
        durationSec: 60,
        cycles: 1,
        restSec: 10,
      });
    }
  }, [editId, isNew, presets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPods = Math.min(6, Math.max(1, form.numPods ?? 1));
    const podsPerPlayer = form.mode === "competition"
      ? Math.min(3, Math.max(1, form.podsPerPlayer ?? 1))
      : undefined;
    const payload = {
      name: form.name?.trim(),
      mode: form.mode ?? "random",
      num_pods: numPods,
      pods_per_player: podsPerPlayer,
      colors: form.colors ?? [],
      duration_sec: form.durationSec ?? 60,
      cycles: form.cycles ?? 1,
      rest_sec: form.restSec ?? 10,
    };

    try {
      if (form.id != null) {
        await fetch(`/api/presets/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setSearchParams({});
      setForm({ name: "", mode: "random", numPods: 2, podsPerPlayer: 1, colors: ["red", "green", "blue"], durationSec: 60, cycles: 1, restSec: 10 });
      fetch("/api/presets")
        .then((r) => r.json())
        .then((data) => setPresets(Array.isArray(data) ? data.map(toPreset) : []));
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this preset?")) return;
    try {
      await fetch(`/api/presets/${id}`, { method: "DELETE" });
      setPresets((prev) => prev.filter((p) => p.id !== id));
      setSearchParams({});
    } catch {}
  };

  const showForm = isNew || editId;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Presets</h1>
        {!showForm && (
          <Link
            to="?new=true"
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium text-sm"
          >
            New
          </Link>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Name</label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={form.mode === "random"}
                  onChange={() => setForm((f) => ({ ...f, mode: "random" }))}
                  className="accent-cyan-500"
                />
                <span>Random</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={form.mode === "competition"}
                  onChange={() => setForm((f) => ({ ...f, mode: "competition" }))}
                  className="accent-cyan-500"
                />
                <span>Competition</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Number of pods (1–6)</label>
            <input
              type="number"
              min={1}
              max={6}
              value={form.numPods ?? 2}
              onChange={(e) => setForm((f) => ({ ...f, numPods: parseInt(e.target.value, 10) || 1 }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {form.mode === "competition" && (
            <div>
              <label className="block text-slate-400 text-sm mb-1">Pods per player</label>
              <input
                type="number"
                min={1}
                max={3}
                value={form.podsPerPlayer ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, podsPerPlayer: parseInt(e.target.value, 10) || 1 }))}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-sm mb-1">Colors</label>
            <ColorPicker
              selected={form.colors ?? []}
              onChange={(colors) => setForm((f) => ({ ...f, colors }))}
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Duration (seconds)</label>
            <input
              type="number"
              min={1}
              value={form.durationSec ?? 60}
              onChange={(e) => setForm((f) => ({ ...f, durationSec: parseInt(e.target.value, 10) || 60 }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Cycles</label>
            <input
              type="number"
              min={1}
              value={form.cycles ?? 1}
              onChange={(e) => setForm((f) => ({ ...f, cycles: parseInt(e.target.value, 10) || 1 }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Rest between cycles (seconds)</label>
            <input
              type="number"
              min={0}
              value={form.restSec ?? 10}
              onChange={(e) => setForm((f) => ({ ...f, restSec: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="px-4 py-3 rounded-lg bg-slate-600 hover:bg-slate-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : loading ? (
        <p className="text-slate-400 text-center py-8">Loading presets…</p>
      ) : presets.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-6 text-center">
          <p className="text-slate-400 mb-4">No presets yet</p>
          <Link
            to="?new=true"
            className="inline-block px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500"
          >
            Create one
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {presets.map((p) => (
            <li
              key={p.id}
              className="bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-slate-500 text-sm">
                  {p.mode} · {p.numPods} pods · {p.durationSec}s
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to={`?edit=${p.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-sm"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id!)}
                  className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
