/**
 * BlazePod BLE protocol constants and utilities.
 * Ported from Python (blazepod/protocol.py).
 * Based on https://github.com/sasodoma/blazepod-hacking
 */

export const BLAZEPOD_COMPANY_ID = 0x09d7;

// Nordic UART Service UUIDs
export const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Color control: write G B R bytes (optional 4th byte: 0x01 = turn off on tap)
export const COLOR_SERVICE_UUID = "50c97bfa-4cb8-4c84-b745-0e58a0280cd6";
export const COLOR_CHAR_UUID = "50c912a2-4cb8-4c84-b745-0e58a0280cd6";

// Tap events: subscribe for 8-byte notifications
export const TAP_SERVICE_UUID = "50c928bd-4cb8-4c84-b745-0e58a0280cd6";
export const TAP_CHAR_UUID = "50c9727e-4cb8-4c84-b745-0e58a0280cd6";

const TAP_POD_WAS_OFF = 0x00;
const TAP_POD_STAYED_ON = 0x21;
const TAP_POD_TURNED_OFF = 0x25;

const AUTH_HEADER = new Uint8Array([0x73, 0x65, 0x61]);

export interface TapEvent {
  mode: string;
  elapsedMs: number;
}

/**
 * Compute the 7-byte auth payload from BLE manufacturer data.
 * CRC32 variant: polynomial varies by offset, then bit mixing.
 * Uses >>> 0 for uint32 arithmetic in JavaScript.
 */
export function computeAuthPayload(mfrData: Uint8Array): Uint8Array {
  if (mfrData.length < 6) {
    throw new Error(
      `Manufacturer data too short: expected >= 6 bytes, got ${mfrData.length}`
    );
  }

  const offset = mfrData[1];
  const dataBytes = mfrData.slice(2, 6);

  const poly = (0xedb88321 + (offset % 50)) >>> 0;

  let crc = 0xffffffff >>> 0;
  for (let i = 0; i < dataBytes.length; i++) {
    crc = (crc ^ dataBytes[i]) >>> 0;
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = ((crc >>> 1) ^ poly) >>> 0;
      } else {
        crc = (crc >>> 1) >>> 0;
      }
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  // Bit mixing (same as sasodoma's main.c)
  crc = (crc + (crc << 3)) >>> 0;
  crc = (crc ^ (crc >>> 11)) >>> 0;
  crc = (crc + (crc << 15)) >>> 0;

  const result = new Uint8Array(7);
  result.set(AUTH_HEADER, 0);
  result[3] = crc & 0xff;
  result[4] = (crc >>> 8) & 0xff;
  result[5] = (crc >>> 16) & 0xff;
  result[6] = (crc >>> 24) & 0xff;

  return result;
}

/**
 * Build a color command in G B R format.
 * Optional 4th byte 0x01 turns pod off when tapped.
 */
export function makeColorCmd(
  r: number,
  g: number,
  b: number,
  tapOff?: boolean
): Uint8Array {
  const data = new Uint8Array(tapOff ? 4 : 3);
  data[0] = g & 0xff;
  data[1] = b & 0xff;
  data[2] = r & 0xff;
  if (tapOff) {
    data[3] = 0x01;
  }
  return data;
}

const TAP_MODE_MAP: Record<number, string> = {
  [TAP_POD_WAS_OFF]: "pod_was_off",
  [TAP_POD_STAYED_ON]: "pod_stayed_on",
  [TAP_POD_TURNED_OFF]: "pod_turned_off",
};

/**
 * Parse an 8-byte tap notification.
 */
export function parseTapEvent(data: DataView): TapEvent {
  const modeByte = data.getUint8(0);
  const elapsedMs = data.getUint32(1, true);

  const mode =
    TAP_MODE_MAP[modeByte] ?? `unknown_0x${modeByte.toString(16).padStart(2, "0")}`;

  return { mode, elapsedMs };
}
