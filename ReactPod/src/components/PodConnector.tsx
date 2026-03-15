import { useState, useEffect } from "react";
import { podManager } from "../ble/manager";
import type { BlazePodDevice } from "../ble/device";

function usePods(): BlazePodDevice[] {
  const [pods, setPods] = useState<BlazePodDevice[]>(() => podManager.allPods);

  useEffect(() => {
    return podManager.subscribe(() => setPods([...podManager.allPods]));
  }, []);

  return pods;
}

export default function PodConnector() {
  const pods = usePods();
  const connectedCount = pods.filter((p) => p.isConnected).length;
  const [adding, setAdding] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPod = async () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not available");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await podManager.addPod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pod");
    } finally {
      setAdding(false);
    }
  };

  const handleReconnectAll = async () => {
    if (!navigator.bluetooth) return;
    setReconnecting(true);
    setError(null);
    try {
      await podManager.reconnectAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconnect");
    } finally {
      setReconnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setError(null);
    try {
      await podManager.removePod(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-300 text-sm">
          Connected: {connectedCount} pod{connectedCount !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleAddPod}
            disabled={adding}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {adding ? "Adding…" : "Add Pod"}
          </button>
          <button
            onClick={handleReconnectAll}
            disabled={reconnecting}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {reconnecting ? "Reconnecting…" : "Reconnect"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {pods.length > 0 && (
        <ul className="space-y-2">
          {pods.map((pod) => (
            <li
              key={pod.id}
              className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    pod.isConnected ? (pod.isAuthenticated ? "bg-green-400" : "bg-yellow-400") : "bg-red-400"
                  }`}
                />
                <span className="text-sm truncate">{pod.name}</span>
                {pod.isConnected && !pod.isAuthenticated && (
                  <span className="text-[10px] text-yellow-400 shrink-0">no auth</span>
                )}
              </div>
              <button
                onClick={() => handleDisconnect(pod.id)}
                className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 rounded shrink-0"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}

      {pods.some((p) => p.isConnected && !p.isAuthenticated) && (
        <p className="text-yellow-400/80 text-xs leading-relaxed">
          Pods connected without authentication. If they don't respond to
          commands, enable{" "}
          <span className="font-mono text-yellow-300 break-all">
            chrome://flags/#enable-experimental-web-platform-features
          </span>{" "}
          in Chrome and reconnect.
        </p>
      )}
    </div>
  );
}
