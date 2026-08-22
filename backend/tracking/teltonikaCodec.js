/**
 * Teltonika Codec8 / Codec8 Extended / Codec16 AVL protocol parser.
 *
 * This module only deals with bytes in -> structured data out. It knows
 * nothing about TCP sockets or the database, which keeps it independently
 * testable and reusable for replay/debug tools.
 */

const CODEC8 = 0x08;
const CODEC8_EXT = 0x8e;
const CODEC16 = 0x10;

// Confirmed Teltonika AVL IO IDs. Unknown values are kept in io.elements.
const IO_ODOMETER = 16;
const IO_GSM_SIGNAL = 21;
const IO_EXTERNAL_VOLTAGE = 66;
const IO_BATTERY_VOLTAGE = 67;
const IO_BATTERY_LEVEL = 113;
const IO_TRIP_ODOMETER = 199;
const IO_IGNITION = 239;
const IO_MOVEMENT = 240;

// CRC-16/IBM (CRC-16/ARC), used by Teltonika to validate AVL data fields.
function crc16ibm(buffer) {
  let crc = 0x0000;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x0001 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

/**
 * TCP identification frame: { 2 bytes length, N bytes ASCII IMEI }.
 * Returns null until the full IMEI frame has arrived.
 */
function decodeImeiHandshake(buffer) {
  if (buffer.length < 2) return null;
  const len = buffer.readUInt16BE(0);
  if (buffer.length < 2 + len) return null;
  const imei = buffer.toString("ascii", 2, 2 + len);
  return { imei, bytesConsumed: 2 + len };
}

/**
 * Decodes one complete Teltonika AVL packet from a buffer that starts at the
 * 4-byte zero preamble. Returns null when the TCP stream is still incomplete.
 */
function decodeAvlPacket(buffer) {
  if (buffer.length < 8) return null;

  const preamble = buffer.readUInt32BE(0);
  if (preamble !== 0) {
    throw new Error(
      `Invalid preamble: expected 0x00000000, got 0x${preamble.toString(16)}`,
    );
  }

  const dataFieldLength = buffer.readUInt32BE(4);
  const totalPacketLength = 8 + dataFieldLength + 4;
  if (buffer.length < totalPacketLength) return null;

  const dataField = buffer.subarray(8, 8 + dataFieldLength);
  const crcField = buffer.readUInt32BE(8 + dataFieldLength);
  const expectedCrc = crc16ibm(dataField);
  const crcOk = (crcField & 0xffff) === expectedCrc;

  let offset = 0;
  const codecId = dataField.readUInt8(offset);
  offset += 1;
  if (codecId !== CODEC8 && codecId !== CODEC8_EXT && codecId !== CODEC16) {
    throw new Error(
      `Unsupported codec ID: 0x${codecId.toString(16)} (only Codec8 / Codec8 Extended / Codec16 supported)`,
    );
  }

  const extended = codecId === CODEC8_EXT;
  const codec16 = codecId === CODEC16;
  const numberOfData1 = dataField.readUInt8(offset);
  offset += 1;

  const records = [];
  for (let i = 0; i < numberOfData1; i++) {
    const { record, bytesRead } = decodeRecord(dataField, offset, {
      codecId,
      extended,
      codec16,
    });
    records.push(record);
    offset += bytesRead;
  }

  const numberOfData2 = dataField.readUInt8(offset);
  offset += 1;
  if (numberOfData2 !== numberOfData1) {
    throw new Error(
      `Record count mismatch: NOD1=${numberOfData1} NOD2=${numberOfData2}`,
    );
  }

  return {
    codecId,
    extended,
    codec16,
    records,
    crcOk,
    bytesConsumed: totalPacketLength,
  };
}

function decodeRecord(buf, startOffset, { codecId, extended, codec16 }) {
  let offset = startOffset;

  const timestampMs = Number(buf.readBigUInt64BE(offset));
  offset += 8;
  const priority = buf.readUInt8(offset);
  offset += 1;

  const longitude = buf.readInt32BE(offset) / 10000000;
  offset += 4;
  const latitude = buf.readInt32BE(offset) / 10000000;
  offset += 4;
  const altitude = buf.readInt16BE(offset);
  offset += 2;
  const angle = buf.readUInt16BE(offset);
  offset += 2;
  const satellites = buf.readUInt8(offset);
  offset += 1;
  const speed = buf.readUInt16BE(offset);
  offset += 2;

  const ioIdSize = extended || codec16 ? 2 : 1;
  const ioCountSize = extended ? 2 : 1;

  const eventIoId = readUIntBE(buf, offset, ioIdSize);
  offset += ioIdSize;

  let generationType = null;
  if (codec16) {
    generationType = buf.readUInt8(offset);
    offset += 1;
  }

  const totalIoCount = readUIntBE(buf, offset, ioCountSize);
  offset += ioCountSize;

  const io = { eventIoId, totalIoCount, elements: {}, elementMeta: {} };
  for (const valueSize of [1, 2, 4, 8]) {
    const count = readUIntBE(buf, offset, ioCountSize);
    offset += ioCountSize;
    for (let j = 0; j < count; j++) {
      const id = readUIntBE(buf, offset, ioIdSize);
      offset += ioIdSize;
      const value = readUIntBE(buf, offset, valueSize);
      offset += valueSize;
      storeIo(io, id, value, valueSize);
    }
  }

  if (extended) {
    const varCount = readUIntBE(buf, offset, ioCountSize);
    offset += ioCountSize;
    for (let j = 0; j < varCount; j++) {
      const id = readUIntBE(buf, offset, ioIdSize);
      offset += ioIdSize;
      const len = buf.readUInt16BE(offset);
      offset += 2;
      const value = buf.subarray(offset, offset + len);
      offset += len;
      storeIo(io, id, value.toString("hex"), len, "hex");
    }
  }

  mapConfirmedIo(io);

  const record = {
    codecId,
    timestamp: new Date(timestampMs),
    priority,
    latitude,
    longitude,
    altitude,
    course: angle,
    satellites,
    speedKmh: speed,
    ignition: hasIo(io, IO_IGNITION) ? io.elements[IO_IGNITION] === 1 : null,
    movement: hasIo(io, IO_MOVEMENT) ? io.elements[IO_MOVEMENT] === 1 : null,
    eventIoId,
    generationType,
    io,
  };

  return { record, bytesRead: offset - startOffset };
}

function storeIo(io, id, value, size, encoding = "uint") {
  io.elements[id] = value;
  io.elementMeta[id] = { size, encoding };
}

function hasIo(io, id) {
  return Object.prototype.hasOwnProperty.call(io.elements, id);
}

function mapConfirmedIo(io) {
  if (hasIo(io, IO_IGNITION)) io.ignition = io.elements[IO_IGNITION] === 1;
  if (hasIo(io, IO_MOVEMENT)) io.movement = io.elements[IO_MOVEMENT] === 1;
  if (hasIo(io, IO_EXTERNAL_VOLTAGE)) {
    io.externalVoltage = io.elements[IO_EXTERNAL_VOLTAGE] / 1000;
  }
  if (hasIo(io, IO_BATTERY_VOLTAGE)) {
    io.batteryVoltage = io.elements[IO_BATTERY_VOLTAGE] / 1000;
  }
  if (hasIo(io, IO_BATTERY_LEVEL)) {
    io.batteryPercent = io.elements[IO_BATTERY_LEVEL];
  }
  if (hasIo(io, IO_GSM_SIGNAL)) io.gsmSignal = io.elements[IO_GSM_SIGNAL];
  if (hasIo(io, IO_ODOMETER)) {
    io.odometerKm = io.elements[IO_ODOMETER] / 1000;
  }
  if (hasIo(io, IO_TRIP_ODOMETER)) {
    io.tripOdometerKm = io.elements[IO_TRIP_ODOMETER] / 1000;
  }
}

function readUIntBE(buf, offset, size) {
  if (size === 1) return buf.readUInt8(offset);
  if (size === 2) return buf.readUInt16BE(offset);
  if (size === 4) return buf.readUInt32BE(offset);
  if (size === 8) return Number(buf.readBigUInt64BE(offset));
  throw new Error(`Unsupported IO value size: ${size}`);
}

function encodeAck(recordCount) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(recordCount, 0);
  return buf;
}

module.exports = {
  crc16ibm,
  decodeImeiHandshake,
  decodeAvlPacket,
  encodeAck,
  CODEC8,
  CODEC8_EXT,
  CODEC16,
  IO_ODOMETER,
  IO_GSM_SIGNAL,
  IO_EXTERNAL_VOLTAGE,
  IO_BATTERY_VOLTAGE,
  IO_BATTERY_LEVEL,
  IO_TRIP_ODOMETER,
  IO_IGNITION,
  IO_MOVEMENT,
};
