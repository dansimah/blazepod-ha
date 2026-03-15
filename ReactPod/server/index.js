import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import db from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.use(express.json());

if (!isProduction) {
  app.use(cors());
}

// --- API: Presets ---

app.get("/api/presets", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM presets ORDER BY id").all();
    const presets = rows.map((r) => ({
      ...r,
      colors: JSON.parse(r.colors || "[]"),
    }));
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/presets", (req, res) => {
  try {
    const { name, mode, num_pods, pods_per_player, colors, duration_sec, cycles, rest_sec } = req.body ?? {};
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required and must be a non-empty string" });
    }
    const validMode = ["random", "competition"].includes(mode ?? "random") ? (mode ?? "random") : "random";
    const numPods = Math.max(1, Math.min(4, parseInt(num_pods, 10) || 1));
    const podsPerPlayer = pods_per_player != null ? Math.max(1, Math.min(4, parseInt(pods_per_player, 10) || 1)) : null;
    const colorsArr = Array.isArray(colors) ? colors : ["red", "green", "blue", "yellow", "cyan", "magenta", "white"];
    const durationSec = Math.max(1, parseInt(duration_sec, 10) || 60);
    const cyclesCount = Math.max(1, parseInt(cycles, 10) || 1);
    const restSec = Math.max(0, parseInt(rest_sec, 10) ?? 10);

    const stmt = db.prepare(
      "INSERT INTO presets (name, mode, num_pods, pods_per_player, colors, duration_sec, cycles, rest_sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(name.trim(), validMode, numPods, podsPerPlayer, JSON.stringify(colorsArr), durationSec, cyclesCount, restSec);
    const row = db.prepare("SELECT * FROM presets WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ ...row, colors: colorsArr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/presets/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid preset id" });
    }

    const existing = db.prepare("SELECT * FROM presets WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Preset not found" });
    }

    const { name, mode, num_pods, pods_per_player, colors, duration_sec, cycles, rest_sec } = req.body ?? {};
    const updName = name != null && typeof name === "string" && name.trim() !== "" ? name.trim() : existing.name;
    const updMode = ["random", "competition"].includes(mode ?? existing.mode) ? (mode ?? existing.mode) : existing.mode;
    const updNumPods = num_pods != null ? Math.max(1, Math.min(4, parseInt(num_pods, 10) || 1)) : existing.num_pods;
    const updPodsPerPlayer = pods_per_player != null ? Math.max(1, Math.min(4, parseInt(pods_per_player, 10) || 1)) : existing.pods_per_player;
    const updColors = Array.isArray(colors) ? colors : JSON.parse(existing.colors);
    const updDurationSec = duration_sec != null ? Math.max(1, parseInt(duration_sec, 10) || 60) : existing.duration_sec;
    const updCycles = cycles != null ? Math.max(1, parseInt(cycles, 10) || 1) : existing.cycles;
    const updRestSec = rest_sec != null ? Math.max(0, parseInt(rest_sec, 10) ?? 10) : existing.rest_sec;

    const stmt = db.prepare(
      "UPDATE presets SET name=?, mode=?, num_pods=?, pods_per_player=?, colors=?, duration_sec=?, cycles=?, rest_sec=? WHERE id=?"
    );
    stmt.run(updName, updMode, updNumPods, updPodsPerPlayer, JSON.stringify(updColors), updDurationSec, updCycles, updRestSec, id);

    const row = db.prepare("SELECT * FROM presets WHERE id = ?").get(id);
    res.json({ ...row, colors: updColors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/presets/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid preset id" });
    }
    const result = db.prepare("DELETE FROM presets WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Preset not found" });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: History ---

app.get("/api/history", (req, res) => {
  try {
    const presetId = req.query.preset_id;
    let rows;
    if (presetId) {
      const id = parseInt(presetId, 10);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid preset_id" });
      }
      rows = db.prepare("SELECT * FROM history WHERE preset_id = ? ORDER BY date DESC").all(id);
    } else {
      rows = db.prepare("SELECT * FROM history ORDER BY date DESC").all();
    }
    const history = rows.map((r) => ({
      ...r,
      reaction_times: r.reaction_times ? JSON.parse(r.reaction_times) : null,
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history", (req, res) => {
  try {
    const {
      preset_id,
      preset_name,
      mode,
      player,
      duration_sec,
      hits,
      avg_ms,
      min_ms,
      max_ms,
      reaction_times,
    } = req.body ?? {};

    if (!preset_name || typeof preset_name !== "string" || preset_name.trim() === "") {
      return res.status(400).json({ error: "preset_name is required" });
    }
    if (!mode || typeof mode !== "string") {
      return res.status(400).json({ error: "mode is required" });
    }
    if (typeof duration_sec !== "number" || duration_sec < 0) {
      return res.status(400).json({ error: "duration_sec must be a non-negative number" });
    }
    if (typeof hits !== "number" || hits < 0) {
      return res.status(400).json({ error: "hits must be a non-negative number" });
    }

    const stmt = db.prepare(
      "INSERT INTO history (preset_id, preset_name, mode, player, duration_sec, hits, avg_ms, min_ms, max_ms, reaction_times) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      preset_id != null ? parseInt(preset_id, 10) : null,
      preset_name.trim(),
      mode,
      player != null ? parseInt(player, 10) : null,
      duration_sec,
      hits,
      avg_ms != null ? Number(avg_ms) : null,
      min_ms != null ? Number(min_ms) : null,
      max_ms != null ? Number(max_ms) : null,
      reaction_times != null ? JSON.stringify(reaction_times) : null
    );

    const row = db.prepare("SELECT * FROM history WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ ...row, reaction_times: row.reaction_times ? JSON.parse(row.reaction_times) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static & SPA fallback ---

if (isProduction) {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(join(distPath, "index.html"));
  });
}

const PORT = parseInt(process.env.PORT, 10) || 3001;
app.listen(PORT, () => {
  console.log(`ReactPod server running on port ${PORT} (${isProduction ? "production" : "development"})`);
});
