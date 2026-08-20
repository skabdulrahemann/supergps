/**
 * Self-contained regression test for tracking/teltonikaCodec.js.
 * No test framework needed — run directly with: node tracking/teltonikaCodec.test.js
 *
 * It builds synthetic Codec8 packets (encoding known values by hand, the way
 * a real Teltonika device would) and verifies the parser decodes them back
 * to the same values. This lets us trust the parser BEFORE wiring it to a
 * real TCP connection or a real device in later steps.
 */
const assert = require('assert');
const { decodeImeiHandshake, decodeAvlPacket, crc16ibm, encodeAck } = require('./teltonikaCodec');

function buildTestPacket({ lat, lng, alt, angle, sats, speed, ignition, timestampMs }) {
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

function run() {
  // Test 1: IMEI handshake
  const imeiFrame = Buffer.concat([
    (() => { const b = Buffer.alloc(2); b.writeUInt16BE(15); return b; })(),
    Buffer.from('864636050000001', 'ascii'),
  ]);
  const handshake = decodeImeiHandshake(imeiFrame);
  assert.strictEqual(handshake.imei, '864636050000001');
  assert.strictEqual(handshake.bytesConsumed, imeiFrame.length);
  console.log('✓ IMEI handshake decodes correctly');

  // Test 2: AVL packet with known values round-trips correctly
  const ts = Date.now();
  const packet = buildTestPacket({ lat: 19.1383, lng: 77.3210, alt: 450, angle: 180, sats: 9, speed: 42, ignition: true, timestampMs: ts });
  const decoded = decodeAvlPacket(packet);
  assert.ok(decoded, 'decoded packet should not be null');
  assert.strictEqual(decoded.crcOk, true);
  assert.strictEqual(decoded.records.length, 1);

  const r = decoded.records[0];
  assert.ok(Math.abs(r.latitude - 19.1383) < 0.0000001);
  assert.ok(Math.abs(r.longitude - 77.3210) < 0.0000001);
  assert.strictEqual(r.altitude, 450);
  assert.strictEqual(r.course, 180);
  assert.strictEqual(r.satellites, 9);
  assert.strictEqual(r.speedKmh, 42);
  assert.strictEqual(r.ignition, true);
  assert.strictEqual(r.timestamp.getTime(), ts);
  assert.strictEqual(decoded.bytesConsumed, packet.length);
  console.log('✓ AVL packet decodes to the exact values it was encoded with');

  // Test 3: partial buffer returns null (waiting for more bytes), never throws
  const partial = packet.subarray(0, 10);
  assert.strictEqual(decodeAvlPacket(partial), null);
  console.log('✓ Partial/incomplete buffer handled without throwing');

  // Test 4: ignition OFF decodes correctly
  const packetOff = buildTestPacket({ lat: 19.0, lng: 77.0, alt: 100, angle: 0, sats: 5, speed: 0, ignition: false, timestampMs: ts });
  assert.strictEqual(decodeAvlPacket(packetOff).records[0].ignition, false);
  console.log('✓ Ignition OFF decodes correctly');

  // Test 5: corrupted CRC is flagged, not silently accepted
  const corrupted = Buffer.from(packet);
  corrupted[corrupted.length - 1] ^= 0xff;
  assert.strictEqual(decodeAvlPacket(corrupted).crcOk, false);
  console.log('✓ Corrupted CRC is detected');

  // Test 6: ACK encoding
  assert.strictEqual(encodeAck(1).readUInt32BE(0), 1);
  console.log('✓ ACK encodes record count correctly');

  console.log('\nALL TELTONIKA CODEC TESTS PASSED ✅');
}

run();
