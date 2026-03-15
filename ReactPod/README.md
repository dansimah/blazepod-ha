# ReactPod

BlazePod fitness training app — connect pods via Web Bluetooth, run timed reaction drills, track your stats.

**Android Chrome only** (Web Bluetooth requirement).

## Architecture

```
Phone (Chrome)                 Debian LXC (Proxmox)
┌──────────────┐               ┌──────────────────┐
│  React UI    │──── HTTPS ───▶│  Express API     │
│  Web BLE  ───┼── BLE ──▶ Pods│  SQLite (presets │
│              │               │   + history)     │
└──────────────┘               │  Static dist/    │
                               └──────────────────┘
```

BLE runs directly between the phone and the pods (zero server latency). The server only stores presets/history and serves the frontend.

---

## Development Setup (Windows/Mac/Linux)

### Prerequisites

- Node.js 24 LTS
- npm (comes with Node)

### Install & run

```bash
cd ReactPod
npm install
```

Start the backend (port 3001) and the Vite dev server (port 5173) in two terminals:

```bash
# Terminal 1 — API server
npm run server

# Terminal 2 — Vite dev server (hot reload)
npm run dev
```

Open http://localhost:5173 in Chrome. The Vite proxy forwards `/api/*` requests to `localhost:3001`.

> **Note:** Web Bluetooth won't work on `localhost` unless you use Chrome on Android or enable the Chrome flag `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add `http://localhost:5173`.

### Build check

```bash
npm run build   # tsc + vite build → dist/
```

---

## Production Deployment (Debian LXC + pm2)

### 1. Install Node.js 24 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs
node -v   # should show v24.x.x
```

### 2. Install pm2

```bash
sudo npm install -g pm2
```

### 3. Clone and build

```bash
git clone <your-repo-url> /opt/reactpod
cd /opt/reactpod/ReactPod
npm install
npm run build
```

### 4. Start with pm2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

The app serves on port **3000** in production (configurable in `ecosystem.config.cjs`).

### 5. Expose via Cloudflare Tunnel

Web Bluetooth requires HTTPS. Set up a Cloudflare Tunnel pointing to `http://localhost:3000`:

```bash
cloudflared tunnel --url http://localhost:3000
```

Or configure a named tunnel in your Cloudflare dashboard for a permanent subdomain (e.g. `reactpod.yourdomain.com`).

---

## pm2 Cheat Sheet

| Command | Description |
|---|---|
| `pm2 start ecosystem.config.cjs` | Start the app |
| `pm2 stop reactpod` | Stop |
| `pm2 restart reactpod` | Restart |
| `pm2 logs reactpod` | View logs |
| `pm2 monit` | Live dashboard |
| `pm2 status` | Process list |

---

## Updating

```bash
cd /opt/reactpod/ReactPod
git pull
npm install
npm run build
pm2 restart reactpod
```

---

## Project Structure

```
ReactPod/
├── server/
│   ├── index.js           Express API + static serving
│   └── db.js              SQLite schema + seed presets
├── src/
│   ├── ble/
│   │   ├── protocol.ts    BLE auth (CRC32), color commands, tap parsing
│   │   ├── device.ts      BlazePodDevice (Web Bluetooth)
│   │   └── manager.ts     Multi-pod connection pool (singleton)
│   ├── activities/
│   │   ├── types.ts       Preset, HitEvent, ActivityResult interfaces
│   │   ├── random.ts      Random mode game loop
│   │   └── competition.ts 2-player parallel mode
│   ├── pages/
│   │   ├── HomePage.tsx    Connect pods + pick preset
│   │   ├── ActivityPage.tsx  Live game with countdown
│   │   ├── ResultsPage.tsx   Post-game stats + save
│   │   ├── PresetsPage.tsx   CRUD presets
│   │   └── HistoryPage.tsx   Past results
│   ├── components/
│   │   ├── PodConnector.tsx  Add/reconnect/disconnect pods
│   │   ├── ColorPicker.tsx   Multi-select color circles
│   │   └── LiveStats.tsx     Timer + hit counter during play
│   ├── App.tsx             Router + bottom nav
│   ├── main.tsx            Entry point
│   └── index.css           Tailwind import
├── ecosystem.config.cjs    pm2 config
├── vite.config.ts          Vite + React + Tailwind + API proxy
├── tsconfig.json
└── package.json
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/presets` | List all presets |
| POST | `/api/presets` | Create a preset |
| PUT | `/api/presets/:id` | Update a preset |
| DELETE | `/api/presets/:id` | Delete a preset |
| GET | `/api/history` | List history (optional `?preset_id=X`) |
| POST | `/api/history` | Save an activity result |

---

## Connecting Pods

1. **First time:** Tap "Add Pod" → Chrome shows a BLE picker → select your BlazePod. Repeat for each pod.
2. **Return visits:** Tap "Reconnect" → previously paired pods connect automatically (no picker needed).

The app authenticates each pod using the manufacturer data CRC32 handshake over the Nordic UART Service, then controls colors via the `50c912a2` characteristic (G-B-R byte order) and listens for tap events on `50c9727e`.

---

## Database

SQLite file stored at `server/reactpod.db`. Created automatically on first run with 4 seed presets:

- **Quick Drill** — 2 pods, 30s, red/blue/green
- **Full Workout** — 4 pods, 120s × 3 cycles, all colors
- **Speed Test** — 1 pod, 30s, red only
- **1v1 Battle** — competition, 4 pods (2 per player), 60s

To reset the database, delete `server/reactpod.db` and restart the server.
