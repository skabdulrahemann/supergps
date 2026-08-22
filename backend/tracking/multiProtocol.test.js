const assert = require("assert");
const {
  decodeMaharashtraPacket,
  xorChecksum,
} = require("./maharashtraProtocol");
const {
  decodeGt06Packet,
  encodeGt06Ack,
  PROTOCOL_LOGIN,
  PROTOCOL_LOCATION,
  PROTOCOL_HEARTBEAT,
} = require("./gt06Protocol");
const {
  bcdImei,
  buildGt06Packet,
  buildGt06Location,
  buildGt06Heartbeat,
} = require("./testHelpers");

function withChecksum(payload) {
  return `$${payload}*${xorChecksum(payload).toString(16).toUpperCase().padStart(2, "0")}`;
}

function run() {
  const nmpPayload = [
    "NMP",
    "ABCD01A",
    "1.6.5",
    "NR",
    "1",
    "L",
    "888888888888999",
    "MH01PB0000",
    "1",
    "24032019",
    "060122",
    "29.7599630",
    "N",
    "77.6277844",
    "E",
    "022.5",
    "320.55",
    "04",
    "183.5",
    "1.0",
    "0.3",
    "INA Airtel",
    "1",
    "1",
    "12.5",
    "4.2",
    "0",
    "C",
    "25",
  ].join(",");
  const decodedMh = decodeMaharashtraPacket(
    Buffer.from(withChecksum(nmpPayload), "ascii"),
  );
  assert.strictEqual(decodedMh.crcOk, true);
  assert.strictEqual(decodedMh.imei, "888888888888999");
  assert.strictEqual(decodedMh.records.length, 1);
  assert.ok(Math.abs(decodedMh.records[0].latitude - 29.759963) < 0.0000001);
  assert.strictEqual(decodedMh.records[0].ignition, true);
  console.log("OK Maharashtra NMP packet decodes");

  const login = buildGt06Packet(PROTOCOL_LOGIN, bcdImei("864636050000001"), 7);
  const decodedLogin = decodeGt06Packet(login);
  assert.strictEqual(decodedLogin.crcOk, true);
  assert.strictEqual(decodedLogin.imei, "864636050000001");
  assert.strictEqual(
    encodeGt06Ack(PROTOCOL_LOGIN, 7).subarray(0, 2).toString("hex"),
    "7878",
  );
  console.log("OK GT06 login packet decodes and ACK encodes");

  const location = buildGt06Packet(
    PROTOCOL_LOCATION,
    buildGt06Location({ lat: 19.1383, lng: 77.321 }),
    8,
  );
  const decodedLocation = decodeGt06Packet(location);
  assert.strictEqual(decodedLocation.crcOk, true);
  assert.strictEqual(decodedLocation.records.length, 1);
  assert.ok(Math.abs(decodedLocation.records[0].latitude - 19.1383) < 0.000001);
  assert.ok(Math.abs(decodedLocation.records[0].longitude - 77.321) < 0.000001);
  assert.strictEqual(decodedLocation.records[0].speedKmh, 42);
  console.log("OK GT06 location packet decodes");

  const heartbeat = buildGt06Packet(
    PROTOCOL_HEARTBEAT,
    buildGt06Heartbeat({ terminalInfo: 0x02 }),
    9,
  );
  const decodedHeartbeat = decodeGt06Packet(heartbeat);
  assert.strictEqual(decodedHeartbeat.crcOk, true);
  assert.strictEqual(decodedHeartbeat.packetType, "heartbeat");
  assert.strictEqual(decodedHeartbeat.status.ignition, true);
  assert.strictEqual(
    encodeGt06Ack(PROTOCOL_HEARTBEAT, 9)[3],
    PROTOCOL_HEARTBEAT,
  );
  console.log("OK GT06 heartbeat packet decodes and ACK encodes");

  const corrupt = Buffer.from(location);
  corrupt[corrupt.length - 4] ^= 0xff;
  const decodedCorrupt = decodeGt06Packet(corrupt);
  assert.strictEqual(decodedCorrupt.crcOk, false);
  console.log("OK GT06 invalid CRC is detected");

  console.log("\nALL MULTI-PROTOCOL TESTS PASSED");
}

if (require.main === module) run();

module.exports = { withChecksum };
