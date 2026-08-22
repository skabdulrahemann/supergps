/**
 * Shared helpers for building synthetic Teltonika Codec8 packets in tests.
 * Not used in production code — only by tracking/*.test.js files.
 */
const { crc16ibm } = require("./teltonikaCodec");
const { crc16x25 } = require("./gt06Protocol");

function buildImeiHandshakeFrame(imei) {
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16BE(imei.length, 0);
  return Buffer.concat([lenBuf, Buffer.from(imei, "ascii")]);
}

function buildTeltonikaPacket({
  lat,
  lng,
  alt = 0,
  angle = 0,
  sats = 8,
  speed = 0,
  ignition = false,
  timestampMs = Date.now(),
}) {
  const record = Buffer.concat([
    (() => {
      const b = Buffer.alloc(8);
      b.writeBigUInt64BE(BigInt(timestampMs));
      return b;
    })(),
    Buffer.from([1]), // priority
    (() => {
      const b = Buffer.alloc(4);
      b.writeInt32BE(Math.round(lng * 10000000));
      return b;
    })(),
    (() => {
      const b = Buffer.alloc(4);
      b.writeInt32BE(Math.round(lat * 10000000));
      return b;
    })(),
    (() => {
      const b = Buffer.alloc(2);
      b.writeInt16BE(alt);
      return b;
    })(),
    (() => {
      const b = Buffer.alloc(2);
      b.writeUInt16BE(angle);
      return b;
    })(),
    Buffer.from([sats]),
    (() => {
      const b = Buffer.alloc(2);
      b.writeUInt16BE(speed);
      return b;
    })(),
    Buffer.from([239]), // event IO ID = ignition
    Buffer.from([1]), // total IO count
    Buffer.from([1]), // N1 (1-byte IO count)
    Buffer.from([239, ignition ? 1 : 0]), // id=239, value
    Buffer.from([0]), // N2
    Buffer.from([0]), // N4
    Buffer.from([0]), // N8
  ]);

  const dataField = Buffer.concat([
    Buffer.from([0x08]), // codec ID = Codec8
    Buffer.from([1]), // NOD1 = 1 record
    record,
    Buffer.from([1]), // NOD2 = 1 record
  ]);

  const crc = crc16ibm(dataField);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(dataField.length, 0);

  return Buffer.concat([Buffer.alloc(4), lengthBuf, dataField, crcBuf]); // Buffer.alloc(4) = zero preamble
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
