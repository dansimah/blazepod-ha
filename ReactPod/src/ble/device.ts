import {
  BLAZEPOD_COMPANY_ID,
  NUS_SERVICE_UUID,
  NUS_RX_CHAR_UUID,
  COLOR_SERVICE_UUID,
  COLOR_CHAR_UUID,
  TAP_SERVICE_UUID,
  TAP_CHAR_UUID,
  computeAuthPayload,
  makeColorCmd,
  parseTapEvent,
  type TapEvent,
} from "./protocol";

export class BlazePodDevice {
  private device: BluetoothDevice;
  private server: BluetoothRemoteGATTServer | null = null;
  private colorChar: BluetoothRemoteGATTCharacteristic | null = null;
  private tapChar: BluetoothRemoteGATTCharacteristic | null = null;
  private nusRxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private _onTap: ((event: TapEvent) => void) | null = null;
  private _tapResolve: ((event: TapEvent) => void) | null = null;
  private _connected = false;

  constructor(device: BluetoothDevice) {
    this.device = device;
    this.device.addEventListener("gattserverdisconnected", () => {
      this._connected = false;
    });
  }

  get id(): string {
    return this.device.id;
  }
  get name(): string {
    return this.device.name ?? this.device.id;
  }
  get isConnected(): boolean {
    return this._connected && !!this.server?.connected;
  }

  /** Request a BlazePod from the browser's BLE picker */
  static async requestDevice(): Promise<BlazePodDevice> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { manufacturerData: [{ companyIdentifier: BLAZEPOD_COMPANY_ID }] },
      ],
      optionalServices: [NUS_SERVICE_UUID, COLOR_SERVICE_UUID, TAP_SERVICE_UUID],
      optionalManufacturerData: [BLAZEPOD_COMPANY_ID],
    });
    return new BlazePodDevice(device);
  }

  private _authenticated = false;
  get isAuthenticated(): boolean { return this._authenticated; }

  /** Connect, authenticate (if possible), subscribe to taps */
  async connect(): Promise<void> {
    // Try to get manufacturer data for auth before GATT connect
    let mfrData: Uint8Array | null = null;
    try {
      mfrData = await this.getMfrData();
    } catch {
      console.warn(
        "Could not get manufacturer data (watchAdvertisements unavailable). " +
        "Connecting without auth. Enable chrome://flags/#enable-experimental-web-platform-features if pods don't respond."
      );
    }

    // Connect GATT
    this.server = await this.device.gatt!.connect();
    this._connected = true;

    // Get characteristics
    const nusService = await this.server.getPrimaryService(NUS_SERVICE_UUID);
    this.nusRxChar = await nusService.getCharacteristic(NUS_RX_CHAR_UUID);

    const colorService =
      await this.server.getPrimaryService(COLOR_SERVICE_UUID);
    this.colorChar = await colorService.getCharacteristic(COLOR_CHAR_UUID);

    const tapService = await this.server.getPrimaryService(TAP_SERVICE_UUID);
    this.tapChar = await tapService.getCharacteristic(TAP_CHAR_UUID);

    // Subscribe to tap notifications
    await this.tapChar.startNotifications();
    this.tapChar.addEventListener(
      "characteristicvaluechanged",
      (ev: Event) => {
        const target = ev.target as BluetoothRemoteGATTCharacteristic;
        if (!target.value) return;
        const tapEvent = parseTapEvent(target.value);
        if (this._onTap) this._onTap(tapEvent);
        if (this._tapResolve) {
          this._tapResolve(tapEvent);
          this._tapResolve = null;
        }
      }
    );

    // Authenticate if we have manufacturer data
    if (mfrData) {
      const authPayload = computeAuthPayload(mfrData);
      await this.nusRxChar.writeValue(authPayload as BufferSource);
      this._authenticated = true;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /** Get manufacturer data using watchAdvertisements */
  private async getMfrData(): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        device.removeEventListener("advertisementreceived", handler);
        reject(new Error("Timed out waiting for advertisement data"));
      }, 10000);

      const device = this.device;
      const handler = (event: Event) => {
        const advEvent = event as BluetoothAdvertisingEvent;
        const data = advEvent.manufacturerData?.get(BLAZEPOD_COMPANY_ID);
        if (data) {
          clearTimeout(timeout);
          device.removeEventListener("advertisementreceived", handler);
          resolve(
            new Uint8Array(
              data.buffer,
              data.byteOffset,
              data.byteLength
            )
          );
        }
      };

      device.addEventListener("advertisementreceived", handler);
      const watchPromise = (device as BluetoothDeviceWithWatchAdvertisements)
        .watchAdvertisements?.();
      if (watchPromise) {
        watchPromise.catch(() => {
          clearTimeout(timeout);
          device.removeEventListener("advertisementreceived", handler);
          reject(
            new Error(
              "watchAdvertisements not supported - cannot get manufacturer data for auth"
            )
          );
        });
      } else {
        clearTimeout(timeout);
        device.removeEventListener("advertisementreceived", handler);
        reject(
          new Error(
            "watchAdvertisements not supported - cannot get manufacturer data for auth"
          )
        );
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this._connected = false;
  }

  async setColor(
    r: number,
    g: number,
    b: number,
    tapOff = false
  ): Promise<void> {
    if (!this.colorChar) throw new Error("Not connected");
    await this.colorChar.writeValue(makeColorCmd(r, g, b, tapOff) as BufferSource);
  }

  async turnOff(): Promise<void> {
    await this.setColor(0, 0, 0);
  }

  onTap(callback: (event: TapEvent) => void): void {
    this._onTap = callback;
  }

  waitForTap(timeoutMs?: number): Promise<TapEvent | null> {
    return new Promise<TapEvent | null>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      this._tapResolve = (event) => {
        if (timer) clearTimeout(timer);
        resolve(event);
      };
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          this._tapResolve = null;
          resolve(null);
        }, timeoutMs);
      }
    });
  }
}

/** Extend BluetoothDevice for experimental watchAdvertisements */
interface BluetoothDeviceWithWatchAdvertisements extends BluetoothDevice {
  watchAdvertisements?(): Promise<void>;
}
