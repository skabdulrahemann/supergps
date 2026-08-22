/**
 * JT/T 808 basic protocol parser (2013/2019 framing).
 *
 * Handles 0x7e frames, 0x7d escaping, XOR checksum, registration/auth/
 * heartbeat/general ACK, and standard 0x0200 location reports.
 */

const MSG_TERMINAL_GENERAL_RESPONSE = 0x0001;
const MSG_HEARTBEAT = 0x0002;
const MSG_TERMINAL_REGISTER = 0x0100;
const MSG_TERMINAL_REGISTER_RESPONSE = 0x8100;
const MSG_TERMINAL_AUTH = 0x0102;
const MSG_LOCATION_REPORT = 0x0200;
const MSG_GENERAL_RESPONSE = 0x8001;
const RESULT_SUCCESS = 0;

function looksLikeJt808Packet(buffer) {
  return buffer && buffer.length > 0 && buffer[0] === 0x7e;
}

function decodeJt808Packet(buffer) {
  const start = buffer.indexOf(0x7e);
  if (start < 0) return null;
  if (start > 0) return { bytesConsumed: start, records: [], discarded: true };

  const end = buffer.indexOf(0x7e, 1);
  if (end < 0) return null;

  const escaped = buffer.subarray(1, end);
  const frame = unescapeFrame(escaped);
  if (frame.length < 12) throw new Error("JT808 frame too short");

  const checksum = frame[frame.length - 1];
  const payload = frame.subarray(0, frame.length - 1);
  const checksumOk = xorChecksum(payload) === checksum;

  let offset = 0;
  const type = payload.readUInt16BE(offset); offset += 2;
  const attribute = payload.readUInt16BE(offset); offset += 2;
  const bodyLength = attribute & 0x03ff;
  const fragmented = Boolean(attribute & 0x2000);
  const versioned = Boolean(attribute & 0x4000);
  const protocolVersion = versioned ? payload.readUInt8(offset++) : null;
  const idLength = versioned ? 10 : 6;
  const idBytes = payload.subarray(offset, offset + idLength);
  const imei = decodeBcd(idBytes).replace(/^0+/, "");
  offset += idLength;
  const serial = payload.readUInt16BE(offset); offset += 2;

  let fragment = null;
  if (fragmented) {
    fragment = {
      total: payload.readUInt16BE(offset),
      index: payload.readUInt16BE(offset + 2),
    };
    offset += 4;
  }

  const body = payload.subarray(offset, offset + bodyLength);
  const header = {
    type,
    attribute,
    bodyLength,
    fragmented,
    protocolVersion,
    imei,
    serial,
    fragment,
    idBytes,
  };
  const records = checksumOk && type === MSG_LOCATION_REPORT
    ? [decodeLocation(body, header)]
    : [];

  return {
    protocol: "jt808",
    imei,
    type,
    header,
    records: records.filter(Boolean),
    checksumOk,
    ack: buildAck(header),
    bytesConsumed: end + 1,
  };
}

function decodeLocation(body, header) {
  if (body.length < 28) return null;
  let offset = 0;
  const alarmFlags = body.readUInt32BE(offset); offset += 4;
  const status = body.readUInt32BE(offset); offset += 4;
  let latitude = body.readUInt32BE(offset) / 1000000; offset += 4;
  let longitude = body.readUInt32BE(offset) / 1000000; offset += 4;
  const altitude = body.readUInt16BE(offset); offset += 2;
  const speedKmh = body.readUInt16BE(offset) / 10; offset += 2;
  const course = body.readUInt16BE(offset); offset += 2;
  const timestamp = readBcdDate(body.subarray(offset, offset + 6)); offset += 6;

  if (status & (1 << 2)) latitude *= -1;
  if (status & (1 << 3)) longitude *= -1;

  const io = {
    status,
    alarmFlags,
    elements: {},
    elementMeta: {},
  };
  while (offset + 2 <= body.length) {
    const id = body.readUInt8(offset++);
    const length = body.readUInt8(offset++);
    if (offset + length > body.length) break;
    const value = body.subarray(offset, offset + length);
    offset += length;
    storeAdditionalInfo(io, id, value);
  }

  return {
    protocol: "jt808",
    timestamp,
    latitude,
    longitude,
    altitude,
    speedKmh,
    course,
    satellites: io.satellites ?? null,
    ignition: Boolean(status & 0x01),
    movement: !(status & (1 << 4)),
    gpsValid: Boolean((status & (1 << 1)) || (status & (1 << 18))),
    alarm: alarmFromFlags(alarmFlags),
    io,
    eventIoId: null,
    generationType: null,
    priority: null,
    deviceId: header.imei,
  };
}

function storeAdditionalInfo(io, id, value) {
  const key = id.toString(16).padStart(2, "0");
  io.elements[key] = value.toString("hex");
  io.elementMeta[key] = { size: value.length, encoding: "hex" };

  if (id === 0x01 && value.length === 4) io.odometerKm = value.readUInt32BE(0) / 10;
  if (id === 0x02 && value.length === 2) io.fuel = value.readUInt16BE(0) / 10;
  if (id === 0x03 && value.length === 2) io.obdSpeedKmh = value.readUInt16BE(0) / 10;
  if (id === 0x30 && value.length === 1) io.gsmSignal = value.readUInt8(0);
  if (id === 0x31 && value.length === 1) io.satellites = value.readUInt8(0);
}

function buildAck(header) {
  if (!header || !header.idBytes) return null;
  if (header.type === MSG_TERMINAL_GENERAL_RESPONSE) return null;

  if (header.type === MSG_TERMINAL_REGISTER) {
    const body = Buffer.concat([
      writeUInt(header.serial, 2),
      Buffer.from([RESULT_SUCCESS]),
      Buffer.from(header.imei, "ascii"),
    ]);
    return formatMessage(MSG_TERMINAL_REGISTER_RESPONSE, header, body);
  }

  if ([
    MSG_HEARTBEAT,
    MSG_TERMINAL_AUTH,
    MSG_LOCATION_REPORT,
  ].includes(header.type)) {
    const body = Buffer.concat([
      writeUInt(header.serial, 2),
      writeUInt(header.type, 2),
      Buffer.from([RESULT_SUCCESS]),
    ]);
    return formatMessage(MSG_GENERAL_RESPONSE, header, body);
  }

  return null;
}

function formatMessage(type, requestHeader, body) {
  const attrValue = body.length | (requestHeader.protocolVersion !== null ? 0x4000 : 0);
  const header = Buffer.concat([
    writeUInt(type, 2),
    writeUInt(attrValue, 2),
    requestHeader.protocolVersion !== null ? Buffer.from([requestHeader.protocolVersion]) : Buffer.alloc(0),
    requestHeader.idBytes,
    writeUInt(0, 2),
  ]);
  const payload = Buffer.concat([header, body]);
  const checksum = Buffer.from([xorChecksum(payload)]);
  return Buffer.concat([Buffer.from([0x7e]), escapeFrame(Buffer.concat([payload, checksum])), Buffer.from([0x7e])]);
}

function unescapeFrame(buffer) {
  const bytes = [];
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x7d && i + 1 < buffer.length) {
      const next = buffer[++i];
      bytes.push(next === 0x02 ? 0x7e : next === 0x01 ? 0x7d : next);
    } else {
      bytes.push(buffer[i]);
    }
  }
  return Buffer.from(bytes);
}

function escapeFrame(buffer) {
  const bytes = [];
  for (const byte of buffer) {
    if (byte === 0x7e) bytes.push(0x7d, 0x02);
    else if (byte === 0x7d) bytes.push(0x7d, 0x01);
    else bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function xorChecksum(buffer) {
  let checksum = 0;
  for (const byte of buffer) checksum ^= byte;
  return checksum & 0xff;
}

function decodeBcd(buffer) {
  let value = "";
  for (const byte of buffer) {
    value += ((byte >> 4) & 0x0f).toString(10);
    value += (byte & 0x0f).toString(10);
  }
  return value;
}

function readBcdDate(buffer) {
  const text = decodeBcd(buffer);
  return new Date(Date.UTC(
    2000 + Number.parseInt(text.slice(0, 2), 10),
    Number.parseInt(text.slice(2, 4), 10) - 1,
    Number.parseInt(text.slice(4, 6), 10),
    Number.parseInt(text.slice(6, 8), 10),
    Number.parseInt(text.slice(8, 10), 10),
    Number.parseInt(text.slice(10, 12), 10),
  ));
}

function alarmFromFlags(flags) {
  if (flags & 0x01) return "sos";
  if (flags & 0x02) return "overspeed";
  if (flags & 0x04) return "fatigueDriving";
  if (flags & (1 << 8)) return "powerOff";
  if (flags & (1 << 15)) return "vibration";
  if (flags & (1 << 29)) return "accident";
  return null;
}

function writeUInt(value, size) {
  const buf = Buffer.alloc(size);
  buf.writeUIntBE(value, 0, size);
  return buf;
}

module.exports = {
  MSG_HEARTBEAT,
  MSG_TERMINAL_REGISTER,
  MSG_TERMINAL_AUTH,
  MSG_LOCATION_REPORT,
  looksLikeJt808Packet,
  decodeJt808Packet,
  formatMessage,
  xorChecksum,
  escapeFrame,
};
