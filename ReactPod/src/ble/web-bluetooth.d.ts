// Web Bluetooth API type augmentations
// BluetoothAdvertisingEvent and watchAdvertisements are not yet in DOM lib

interface BluetoothAdvertisingEvent extends Event {
  device: BluetoothDevice;
  rssi?: number;
  txPower?: number;
  manufacturerData?: Map<number, DataView>;
  serviceData?: Map<string, DataView>;
}

interface BluetoothDeviceEventMap {
  advertisementreceived: BluetoothAdvertisingEvent;
  gattserverdisconnected: Event;
}

interface BluetoothDevice extends EventTarget {
  watchAdvertisements?(): Promise<void>;
}
