import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "reactpod.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'random',
    num_pods INTEGER NOT NULL DEFAULT 1,
    pods_per_player INTEGER,
    colors TEXT NOT NULL DEFAULT '["red","green","blue","yellow","cyan","magenta","white"]',
    duration_sec INTEGER NOT NULL DEFAULT 60,
    cycles INTEGER NOT NULL DEFAULT 1,
    rest_sec INTEGER NOT NULL DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id INTEGER,
    preset_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    player INTEGER,
    duration_sec REAL NOT NULL,
    hits INTEGER NOT NULL,
    avg_ms REAL,
    min_ms REAL,
    max_ms REAL,
    reaction_times TEXT,
    date TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default presets if table is empty
const count = db.prepare("SELECT COUNT(*) as c FROM presets").get();
if (count.c === 0) {
  const insert = db.prepare(
    "INSERT INTO presets (name, mode, num_pods, pods_per_player, colors, duration_sec, cycles, rest_sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insert.run("Quick Drill", "random", 2, null, JSON.stringify(["red", "blue", "green"]), 30, 1, 0);
  insert.run("Full Workout", "random", 4, null, JSON.stringify(["red", "green", "blue", "yellow", "cyan", "magenta", "white"]), 120, 3, 15);
  insert.run("Speed Test", "random", 1, null, JSON.stringify(["red"]), 30, 1, 0);
  insert.run("1v1 Battle", "competition", 4, 2, JSON.stringify(["red", "blue"]), 60, 1, 0);
}

export default db;
