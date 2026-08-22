const assert = require("assert");
const {
  MSG_HEARTBEAT,
  MSG_LOCATION_REPORT,
  decodeJt808Packet,
  formatMessage,
} = require("./jt808Protocol");

const IMEI = "864636050000001";

function bcd(text, length) {
  const padded = text.padStart(length * 2, "0");
  return Buffer.from(padded.match(/../g).map((pair) => Number.parseInt(pair, 16)));
}

function buildHeader() {
  return {
    protocolVersion: 1,
    idBytes: bcd(IMEI, 10),
    imei: IMEI,
    serial: 7,
  };
}

function buildLocationBody() {
  const body = Buffer.alloc(28);
  let offset = 0;
  body.writeUInt32BE(0, offset); offset += 4; // alarm
  body.writeUInt32BE(0x00000003, offset); offset += 4; // acc + positioned
  body.writeUInt32BE(Math.round(19.1383 * 1000000), offset); offset += 4;
  body.writeUInt32BE(Math.round(77.321 * 1000000), offset); offset += 4;
  body.writeUInt16BE(450, offset); offset += 2;
  body.writeUInt16BE(420, offset); offset += 2; // 42.0 km/h
  body.writeUInt16BE(180, offset); offset += 2;
  Buffer.from([0x26, 0x08, 0x22, 0x12, 0x00, 0x00]).copy(body, offset);
  return Buffer.concat([body, Buffer.from([0x31, 0x01, 0x09])]);
}

function run() {
  const heartbeat = formatMessage(MSG_HEARTBEAT, buildHeader(), Buffer.alloc(0));
  const decodedHeartbeat = decodeJt808Packet(heartbeat);
  assert.strictEqual(decodedHeartbeat.imei, IMEI);
  assert.strictEqual(decodedHeartbeat.checksumOk, true);
  assert.ok(decodedHeartbeat.ack);
  console.log("PASS JT808 heartbeat decode and ACK");

  const location = formatMessage(MSG_LOCATION_REPORT, buildHeader(), buildLocationBody());
  const decodedLocation = decodeJt808Packet(location);
  assert.strictEqual(decodedLocation.type, MSG_LOCATION_REPORT);
  assert.strictEqual(decodedLocation.records.length, 1);
  const record = decodedLocation.records[0];
  assert.strictEqual(record.protocol, "jt808");
  assert.ok(Math.abs(record.latitude - 19.1383) < 0.000001);
  assert.ok(Math.abs(record.longitude - 77.321) < 0.000001);
  assert.strictEqual(record.altitude, 450);
  assert.strictEqual(record.speedKmh, 42);
  assert.strictEqual(record.course, 180);
  assert.strictEqual(record.ignition, true);
  assert.strictEqual(record.gpsValid, true);
  assert.strictEqual(record.satellites, 9);
  assert.strictEqual(record.timestamp.toISOString(), "2026-08-22T12:00:00.000Z");
  assert.ok(decodedLocation.ack);
  console.log("PASS JT808 location report decode");

  const corrupted = Buffer.from(location);
  corrupted[corrupted.length - 3] ^= 0xff;
  assert.strictEqual(decodeJt808Packet(corrupted).checksumOk, false);
  console.log("PASS JT808 checksum failure detection");

  assert.strictEqual(decodeJt808Packet(location.subarray(0, 10)), null);
  console.log("PASS JT808 partial frame waits for more data");

  console.log("\nALL JT808 PROTOCOL TESTS PASSED");
}

run();
