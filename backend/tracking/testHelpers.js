/**
 * Shared helpers for building synthetic Teltonika Codec8 packets in tests.
 * Not used in production code — only by tracking/*.test.js files.
 */
const { crc16ibm, CODEC8, CODEC8_EXT, CODEC16 } = require("./teltonikaCodec");
const { crc16x25 } = require("./gt06Protocol");

function buildImeiHandshakeFrame(imei) {
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16BE(imei.length, 0);
  return Buffer.concat([lenBuf, Buffer.from(imei, "ascii")]);
}

function buildTeltonikaPacket({
  codecId = CODEC8,
  records,
  lat,
  lng,
  alt = 0,
  angle = 0,
  sats = 8,
  speed = 0,
  ignition = false,
  movement = false,
  timestampMs = Date.now(),
  priority = 1,
  io = {},
  eventIoId = 239,
  generationType = 0,
}) {
  const normalizedRecords =
    records ||
    [
      {
        lat,
        lng,
        alt,
        angle,
        sats,
        speed,
        ignition,
        movement,
        timestampMs,
        priority,
        io,
        eventIoId,
        generationType,
      },
    ];
  const recordBuffers = normalizedRecords.map((record) =>
    buildTeltonikaRecord(record, codecId),
  );
  const dataField = Buffer.concat([
    Buffer.from([codecId]),
    Buffer.from([recordBuffers.length]),
    ...recordBuffers,
    Buffer.from([recordBuffers.length]),
  ]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc16ibm(dataField), 0);
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(dataField.length, 0);
  return Buffer.concat([Buffer.alloc(4), lengthBuf, dataField, crcBuf]);
}

function buildTeltonikaRecord(record, codecId) {
  const extended = codecId === CODEC8_EXT;
  const codec16 = codecId === CODEC16;
  const ioIdSize = extended || codec16 ? 2 : 1;
  const ioCountSize = extended ? 2 : 1;
  const elements = normalizeIoElements(record);

  const fixedElements = elements.filter((item) => !item.variable);
  const oneByte = fixedElements.filter((item) => item.size === 1);
  const twoByte = fixedElements.filter((item) => item.size === 2);
  const fourByte = fixedElements.filter((item) => item.size === 4);
  const eightByte = fixedElements.filter((item) => item.size === 8);
  const variable = extended ? elements.filter((item) => item.variable) : [];
  const totalCount = fixedElements.length + variable.length;

  return Buffer.concat([
    writeUInt(BigInt(record.timestampMs || Date.now()), 8),
    Buffer.from([record.priority ?? 1]),
    writeInt(Math.round(record.lng * 10000000), 4),
    writeInt(Math.round(record.lat * 10000000), 4),
    writeInt(record.alt ?? 0, 2),
    writeUInt(record.angle ?? 0, 2),
    Buffer.from([record.sats ?? 8]),
    writeUInt(record.speed ?? 0, 2),
    writeUInt(record.eventIoId ?? 239, ioIdSize),
    codec16 ? Buffer.from([record.generationType ?? 0]) : Buffer.alloc(0),
    writeUInt(totalCount, ioCountSize),
    buildIoGroup(oneByte, ioIdSize, ioCountSize, 1),
    buildIoGroup(twoByte, ioIdSize, ioCountSize, 2),
    buildIoGroup(fourByte, ioIdSize, ioCountSize, 4),
    buildIoGroup(eightByte, ioIdSize, ioCountSize, 8),
    extended ? buildVariableIoGroup(variable, ioIdSize, ioCountSize) : Buffer.alloc(0),
  ]);
}

function normalizeIoElements(record) {
  const io = { ...(record.io || {}) };
  if (record.ignition !== undefined && io[239] === undefined) {
    io[239] = record.ignition ? 1 : 0;
  }
  if (record.movement !== undefined && io[240] === undefined) {
    io[240] = record.movement ? 1 : 0;
  }
  return Object.entries(io).map(([id, item]) => {
    if (item && typeof item === "object" && !Buffer.isBuffer(item)) {
      return {
        id: Number(id),
        value: item.value,
        size: item.size,
        variable: item.variable,
      };
    }
    return { id: Number(id), value: item, size: smallestIoSize(item) };
  });
}

function smallestIoSize(value) {
  if (Buffer.isBuffer(value)) return value.length;
  if (typeof value === "string") return Buffer.from(value, "hex").length;
  if (value <= 0xff) return 1;
  if (value <= 0xffff) return 2;
  if (value <= 0xffffffff) return 4;
  return 8;
}

function buildIoGroup(items, ioIdSize, ioCountSize, valueSize) {
  return Buffer.concat([
    writeUInt(items.length, ioCountSize),
    ...items.flatMap((item) => [writeUInt(item.id, ioIdSize), writeUInt(item.value, valueSize)]),
  ]);
}

function buildVariableIoGroup(items, ioIdSize, ioCountSize) {
  return Buffer.concat([
    writeUInt(items.length, ioCountSize),
    ...items.flatMap((item) => {
      const value = Buffer.isBuffer(item.value)
        ? item.value
        : typeof item.value === "string"
          ? Buffer.from(item.value, "hex")
          : writeUInt(item.value, item.size);
      return [writeUInt(item.id, ioIdSize), writeUInt(value.length, 2), value];
    }),
  ]);
}

function writeUInt(value, size) {
  const buf = Buffer.alloc(size);
  if (size === 8) buf.writeBigUInt64BE(BigInt(value), 0);
  else buf.writeUIntBE(Number(value), 0, size);
  return buf;
}

function writeInt(value, size) {
  const buf = Buffer.alloc(size);
  if (size === 2) buf.writeInt16BE(value, 0);
  else if (size === 4) buf.writeInt32BE(value, 0);
  else buf.writeIntBE(value, 0, size);
  return buf;
}

function bcdImei(imei) {
  const padded = imei.length % 2 === 0 ? imei : `0${imei}`;
  return Buffer.from(
    padded.match(/../g).map((pair) => Number.parseInt(pair, 16)),
  );
}

function buildGt06Packet(protocol, content, serial = 1) {
  const length = 1 + content.length + 2 + 2;
  const body = Buffer.alloc(2 + content.length + 2);
  body.writeUInt8(length, 0);
  body.writeUInt8(protocol, 1);
  content.copy(body, 2);
  body.writeUInt16BE(serial, body.length - 2);

  const crc = crc16x25(body);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16BE(crc, 0);

  return Buffer.concat([
    Buffer.from([0x78, 0x78]),
    body,
    crcBuf,
    Buffer.from([0x0d, 0x0a]),
  ]);
}

function buildGt06Location({
  lat,
  lng,
  speed = 42,
  course = 180,
  timestamp = new Date(Date.UTC(2026, 7, 21, 6, 1, 22)),
}) {
  const content = Buffer.alloc(30);
  content.writeUInt8(timestamp.getUTCFullYear() - 2000, 0);
  content.writeUInt8(timestamp.getUTCMonth() + 1, 1);
  content.writeUInt8(timestamp.getUTCDate(), 2);
  content.writeUInt8(timestamp.getUTCHours(), 3);
  content.writeUInt8(timestamp.getUTCMinutes(), 4);
  content.writeUInt8(timestamp.getUTCSeconds(), 5);
  content.writeUInt8(0xc0 | 8, 6);
  content.writeUInt32BE(Math.round(Math.abs(lat) * 1800000), 7);
  content.writeUInt32BE(Math.round(Math.abs(lng) * 1800000), 11);
  content.writeUInt8(speed, 15);
  const courseStatus =
    (lat >= 0 ? 0x0400 : 0) | (lng < 0 ? 0x0800 : 0) | (course & 0x03ff);
  content.writeUInt16BE(courseStatus, 16);
  content.writeUInt16BE(404, 18);
  content.writeUInt8(10, 20);
  content.writeUInt16BE(0x00d6, 21);
  content.writeUIntBE(0xcfbd, 23, 3);
  content.writeUInt8(0, 26);
  content.writeUInt8(0, 27);
  content.writeUInt8(0, 28);
  content.writeUInt8(0, 29);
  return content;
}

function buildGt06Heartbeat({
  terminalInfo = 0x02,
  voltage = 0x04,
  gsm = 0x03,
  alarm = 0x00,
} = {}) {
  return Buffer.from([terminalInfo, voltage, gsm, alarm]);
}

module.exports = {
  buildImeiHandshakeFrame,
  buildTeltonikaPacket,
  bcdImei,
  buildGt06Packet,
  buildGt06Location,
  buildGt06Heartbeat,
};
