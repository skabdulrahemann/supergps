/**
 * Shared helpers for building synthetic Teltonika Codec8 packets in tests.
 * Not used in production code — only by tracking/*.test.js files.
 */
const { crc16ibm } = require('./teltonikaCodec');

function buildImeiHandshakeFrame(imei) {
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16BE(imei.length, 0);
  return Buffer.concat([lenBuf, Buffer.from(imei, 'ascii')]);
}

function buildTeltonikaPacket({ lat, lng, alt = 0, angle = 0, sats = 8, speed = 0, ignition = false, timestampMs = Date.now() }) {
  const record = Buffer.concat([
    (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(timestampMs)); return b; })(),
    Buffer.from([1]), // priority
    (() => { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(lng * 10000000)); return b; })(),
    (() => { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(lat * 10000000)); return b; })(),
    (() => { const b = Buffer.alloc(2); b.writeInt16BE(alt); return b; })(),
    (() => { const b = Buffer.alloc(2); b.writeUInt16BE(angle); return b; })(),
    Buffer.from([sats]),
    (() => { const b = Buffer.alloc(2); b.writeUInt16BE(speed); return b; })(),
    Buffer.from([239]),                    // event IO ID = ignition
    Buffer.from([1]),                      // total IO count
    Buffer.from([1]),                      // N1 (1-byte IO count)
    Buffer.from([239, ignition ? 1 : 0]),  // id=239, value
    Buffer.from([0]),                      // N2
    Buffer.from([0]),                      // N4
    Buffer.from([0]),                      // N8
  ]);

  const dataField = Buffer.concat([
    Buffer.from([0x08]), // codec ID = Codec8
    Buffer.from([1]),    // NOD1 = 1 record
    record,
    Buffer.from([1]),    // NOD2 = 1 record
  ]);

  const crc = crc16ibm(dataField);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(dataField.length, 0);

  return Buffer.concat([Buffer.alloc(4), lengthBuf, dataField, crcBuf]); // Buffer.alloc(4) = zero preamble
}

module.exports = { buildImeiHandshakeFrame, buildTeltonikaPacket };
