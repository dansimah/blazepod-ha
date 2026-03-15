import { Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ActivityPage from "./pages/ActivityPage";
import ResultsPage from "./pages/ResultsPage";
import PresetsPage from "./pages/PresetsPage";
import HistoryPage from "./pages/HistoryPage";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/presets", label: "Presets" },
  { path: "/history", label: "History" },
] as const;

function App() {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-slate-900 text-white flex flex-col pb-16">
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-2 safe-area-pb"
        aria-label="Bottom navigation"
      >
        {navItems.map(({ path, label }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-slate-700 text-sky-400"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
              }`}
            >
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
