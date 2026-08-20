/**
 * Teltonika Codec8 / Codec8 Extended AVL protocol parser.
 *
 * This module only deals with bytes in -> structured data out. It knows
 * nothing about TCP sockets or the database — that keeps it independently
 * testable (see teltonikaCodec.test.js) and reusable later for parsing
 * packets from other transports (e.g. a replay/debug tool).
 *
 * Reference: Teltonika "Codec #8" and "Codec #8 Extended" AVL data protocol.
 */

const CODEC8 = 0x08;
const CODEC8_EXT = 0x8e;

// IO element IDs we care about right now. Full IO element list has 100+ entries;
// we only decode the ones we actively use and keep the rest in `raw` for later.
const IO_IGNITION = 239;

// ── CRC-16/IBM (a.k.a. CRC-16/ARC) — used by Teltonika to validate AVL packets ──
function crc16ibm(buffer) {
  let crc = 0x0000;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc & 0xffff;
}

/**
 * Step 1 of the TCP handshake: the device opens the connection and immediately
 * sends its IMEI as { 2 bytes length, N bytes ASCII IMEI }. No preamble here.
 * Returns null if the buffer doesn't yet contain a full IMEI frame.
 */
function decodeImeiHandshake(buffer) {
  if (buffer.length < 2) return null;
  const len = buffer.readUInt16BE(0);
  if (buffer.length < 2 + len) return null; // wait for more bytes
  const imei = buffer.toString('ascii', 2, 2 + len);
  return { imei, bytesConsumed: 2 + len };
}

/**
 * Decodes one or more AVL data records out of a Codec8 / Codec8 Extended packet.
 * Expects the FULL packet starting at the 4-byte preamble (0x00000000).
 * Returns null if the buffer doesn't yet contain a complete packet (wait for more data).
 * Throws if the packet is malformed or CRC doesn't match.
 */
function decodeAvlPacket(buffer) {
  if (buffer.length < 8) return null;

  const preamble = buffer.readUInt32BE(0);
  if (preamble !== 0) throw new Error(`Invalid preamble: expected 0x00000000, got 0x${preamble.toString(16)}`);

  const dataFieldLength = buffer.readUInt32BE(4);
  const totalPacketLength = 8 + dataFieldLength + 4; // preamble+length (8) + data + CRC(4)
  if (buffer.length < totalPacketLength) return null; // wait for more bytes

  const dataField = buffer.subarray(8, 8 + dataFieldLength);
  const crcField = buffer.readUInt32BE(8 + dataFieldLength);
  const expectedCrc = crc16ibm(dataField);
  const crcOk = (crcField & 0xffff) === expectedCrc;

  let offset = 0;
  const codecId = dataField.readUInt8(offset); offset += 1;
  if (codecId !== CODEC8 && codecId !== CODEC8_EXT) {
    throw new Error(`Unsupported codec ID: 0x${codecId.toString(16)} (only Codec8 / Codec8 Extended supported)`);
  }
  const extended = codecId === CODEC8_EXT;

  const numberOfData1 = dataField.readUInt8(offset); offset += 1;

  const records = [];
  for (let i = 0; i < numberOfData1; i++) {
    const { record, bytesRead } = decodeRecord(dataField, offset, extended);
    records.push(record);
    offset += bytesRead;
  }

  const numberOfData2 = dataField.readUInt8(offset); offset += 1;
  if (numberOfData2 !== numberOfData1) {
    throw new Error(`Record count mismatch: NOD1=${numberOfData1} NOD2=${numberOfData2}`);
  }

  return { codecId, extended, records, crcOk, bytesConsumed: totalPacketLength };
}

function decodeRecord(buf, startOffset, extended) {
  let offset = startOffset;

  const timestampMs = Number(buf.readBigUInt64BE(offset)); offset += 8;
  const priority = buf.readUInt8(offset); offset += 1;

  const longitude = buf.readInt32BE(offset) / 10000000; offset += 4;
  const latitude = buf.readInt32BE(offset) / 10000000; offset += 4;
  const altitude = buf.readInt16BE(offset); offset += 2;
  const angle = buf.readUInt16BE(offset); offset += 2;
  const satellites = buf.readUInt8(offset); offset += 1;
  const speed = buf.readUInt16BE(offset); offset += 2;

  const ioIdSize = extended ? 2 : 1;
  const ioCountSize = extended ? 2 : 1;

  const eventIoId = readUIntBE(buf, offset, ioIdSize); offset += ioIdSize;
  const totalIoCount = readUIntBE(buf, offset, ioCountSize); offset += ioCountSize; // informational only

  const io = {};

  // 1-byte, 2-byte, 4-byte, 8-byte value groups (Codec8 Extended also has a
  // variable-length group after the 8-byte group — we skip it if present).
  const groupSizes = [1, 2, 4, 8];
  for (const valueSize of groupSizes) {
    const count = readUIntBE(buf, offset, ioCountSize); offset += ioCountSize;
    for (let j = 0; j < count; j++) {
      const id = readUIntBE(buf, offset, ioIdSize); offset += ioIdSize;
      const value = readUIntBE(buf, offset, valueSize); offset += valueSize;
      io[id] = value;
    }
  }

  if (extended) {
    // Variable-length IO group (Codec8 Extended only): N x { ID:2, Length:2, Value:Length }
    const varCount = readUIntBE(buf, offset, ioCountSize); offset += ioCountSize;
    for (let j = 0; j < varCount; j++) {
      const id = readUIntBE(buf, offset, ioIdSize); offset += ioIdSize;
      const len = buf.readUInt16BE(offset); offset += 2;
      const value = buf.subarray(offset, offset + len); offset += len;
      io[id] = value; // kept as a raw Buffer — none of our current fields use this group
    }
  }

  const record = {
    timestamp: new Date(timestampMs),
    priority,
    latitude,
    longitude,
    altitude,
    course: angle,
    satellites,
    speedKmh: speed,
    ignition: IO_IGNITION in io ? io[IO_IGNITION] === 1 : null,
    io,
  };

  return { record, bytesRead: offset - startOffset };
}

function readUIntBE(buf, offset, size) {
  if (size === 1) return buf.readUInt8(offset);
  if (size === 2) return buf.readUInt16BE(offset);
  if (size === 4) return buf.readUInt32BE(offset);
  if (size === 8) return Number(buf.readBigUInt64BE(offset));
  throw new Error(`Unsupported IO value size: ${size}`);
}

/**
 * The device's ACK after sending AVL data is just the accepted record count
 * as a 4-byte big-endian integer. Building it here keeps the "what does an
 * ACK look like" knowledge next to the parser it corresponds to.
 */
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
  IO_IGNITION,
};
