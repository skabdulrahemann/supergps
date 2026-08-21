/**
 * Concox/Jimi GT06-family binary protocol parser.
 *
 * V5 catalog identifies an Iconcox compact 2G vehicle tracker; this parser
 * covers the common GT06 login, heartbeat/status, GPS location, and alarm
 * location frames used by that device family.
 */

const START_SHORT = 0x7878;
const START_LONG = 0x7979;
const STOP = 0x0d0a;

const PROTOCOL_LOGIN = 0x01;
const PROTOCOL_LOCATION = 0x12;
const PROTOCOL_HEARTBEAT = 0x13;
const PROTOCOL_ALARM = 0x16;

function looksLikeGt06Packet(buffer) {
  return buffer.length >= 2
    && (buffer.readUInt16BE(0) === START_SHORT || buffer.readUInt16BE(0) === START_LONG);
}

function decodeGt06Packet(buffer) {
  if (buffer.length < 5) return null;

  const start = buffer.readUInt16BE(0);
  const longFrame = start === START_LONG;
  if (start !== START_SHORT && start !== START_LONG) {
    throw new Error(`Invalid GT06 start bits: 0x${start.toString(16)}`);
  }

  const lengthSize = longFrame ? 2 : 1;
  const length = longFrame ? buffer.readUInt16BE(2) : buffer.readUInt8(2);
  const headerLength = 2 + lengthSize;
  const totalPacketLength = headerLength + length + 2;
  if (buffer.length < totalPacketLength) return null;

  const stop = buffer.readUInt16BE(totalPacketLength - 2);
  if (stop !== STOP) throw new Error(`Invalid GT06 stop bits: 0x${stop.toString(16)}`);

  const protocolNumber = buffer.readUInt8(headerLength);
  const serialOffset = totalPacketLength - 6;
  const serial = buffer.readUInt16BE(serialOffset);
  const crcField = buffer.readUInt16BE(totalPacketLength - 4);
  const crcPayload = buffer.subarray(2, totalPacketLength - 4);
  const crcOk = crc16x25(crcPayload) === crcField;

  const contentStart = headerLength + 1;
  const contentEnd = serialOffset;
  const content = buffer.subarray(contentStart, contentEnd);

  const parsed = parseContent(protocolNumber, content);
  return {
    protocol: 'gt06',
    protocolNumber,
    serial,
    crcOk,
    bytesConsumed: totalPacketLength,
    ...parsed,
  };
}

function parseContent(protocolNumber, content) {
  if (protocolNumber === PROTOCOL_LOGIN) {
    return { imei: decodeBcd(content.subarray(0, 8)).replace(/^0+/, ''), records: [], packetType: 'login' };
  }

  if (protocolNumber === PROTOCOL_LOCATION || protocolNumber === PROTOCOL_ALARM) {
    return { imei: null, records: [decodeLocation(content)], packetType: protocolNumber === PROTOCOL_ALARM ? 'alarm' : 'location' };
  }

  if (protocolNumber === PROTOCOL_HEARTBEAT) {
    return { imei: null, records: [], packetType: 'heartbeat' };
  }

  return { imei: null, records: [], packetType: `0x${protocolNumber.toString(16)}` };
}

function decodeLocation(content) {
  if (content.length < 18) throw new Error('GT06 location content too short');

  const timestamp = decodeDateTime(content, 0);
  const gpsInfo = content.readUInt8(6);
  const satellites = gpsInfo & 0x0f;
  let latitude = content.readUInt32BE(7) / 1800000;
  let longitude = content.readUInt32BE(11) / 1800000;
  const speedKmh = content.readUInt8(15);
  const courseStatus = content.readUInt16BE(16);

  const course = courseStatus & 0x03ff;
  const north = Boolean(courseStatus & 0x0400);
  const west = Boolean(courseStatus & 0x0800);
  if (!north) latitude = -latitude;
  if (west) longitude = -longitude;

  return {
    timestamp,
    priority: null,
    latitude,
    longitude,
    altitude: null,
    course,
    satellites,
    speedKmh,
    ignition: null,
    io: {
      gpsInfo,
      courseStatus,
    },
  };
}

function decodeDateTime(buffer, offset) {
  const year = 2000 + buffer.readUInt8(offset);
  const month = buffer.readUInt8(offset + 1) - 1;
  const day = buffer.readUInt8(offset + 2);
  const hour = buffer.readUInt8(offset + 3);
  const minute = buffer.readUInt8(offset + 4);
  const second = buffer.readUInt8(offset + 5);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function decodeBcd(buffer) {
  let text = '';
  for (const byte of buffer) {
    text += ((byte >> 4) & 0x0f).toString(16);
    text += (byte & 0x0f).toString(16);
  }
  return text;
}

function encodeGt06Ack(protocolNumber, serial) {
  const payload = Buffer.alloc(4);
  payload.writeUInt8(0x05, 0);
  payload.writeUInt8(protocolNumber, 1);
  payload.writeUInt16BE(serial, 2);

  const crc = crc16x25(payload);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16BE(crc, 0);

  return Buffer.concat([
    Buffer.from([0x78, 0x78]),
    payload,
    crcBuf,
    Buffer.from([0x0d, 0x0a]),
  ]);
}

function crc16x25(buffer) {
  let crc = 0xffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x0001) ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
    }
  }
  return (~crc) & 0xffff;
}

module.exports = {
  decodeGt06Packet,
  encodeGt06Ack,
  looksLikeGt06Packet,
  crc16x25,
  PROTOCOL_LOGIN,
  PROTOCOL_LOCATION,
  PROTOCOL_HEARTBEAT,
  PROTOCOL_ALARM,
};
