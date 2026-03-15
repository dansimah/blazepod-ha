import { BlazePodDevice } from "./device";

class BlazePodManager {
  private pods: Map<string, BlazePodDevice> = new Map();
  private listeners: Set<() => void> = new Set();

  get connectedPods(): BlazePodDevice[] {
    return Array.from(this.pods.values()).filter((p) => p.isConnected);
  }

  get allPods(): BlazePodDevice[] {
    return Array.from(this.pods.values());
  }

  /** Add a new pod via browser picker */
  async addPod(): Promise<BlazePodDevice> {
    const pod = await BlazePodDevice.requestDevice();
    await pod.connect();
    this.pods.set(pod.id, pod);
    this.notify();
    return pod;
  }

  /** Reconnect all previously known pods (using getDevices) */
  async reconnectAll(): Promise<number> {
    const bt = navigator.bluetooth as BluetoothWithGetDevices;
    const getDevices = bt.getDevices;
    if (!getDevices) return 0;
    const devices = await getDevices();
    let count = 0;
    for (const device of devices) {
      if (this.pods.has(device.id)) continue;
      try {
        const pod = new BlazePodDevice(device);
        await pod.connect();
        this.pods.set(pod.id, pod);
        count++;
      } catch {
        // Device not reachable
      }
    }
    this.notify();
    return count;
  }

  async disconnectAll(): Promise<void> {
    for (const pod of this.pods.values()) {
      try {
        await pod.turnOff();
      } catch {}
      try {
        await pod.disconnect();
      } catch {}
    }
    this.pods.clear();
    this.notify();
  }

  async removePod(id: string): Promise<void> {
    const pod = this.pods.get(id);
    if (pod) {
      try {
        await pod.turnOff();
      } catch {}
      try {
        await pod.disconnect();
      } catch {}
      this.pods.delete(id);
      this.notify();
    }
  }

  /** Subscribe to changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

/** Experimental getDevices on navigator.bluetooth */
type BluetoothWithGetDevices = Bluetooth & {
  getDevices?(): Promise<BluetoothDevice[]>;
};

/** Singleton instance */
export const podManager = new BlazePodManager();
