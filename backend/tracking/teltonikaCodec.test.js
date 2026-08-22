const assert = require("assert");
const {
  decodeImeiHandshake,
  decodeAvlPacket,
  encodeAck,
  CODEC8,
  CODEC8_EXT,
  CODEC16,
} = require("./teltonikaCodec");
const { buildImeiHandshakeFrame, buildTeltonikaPacket } = require("./testHelpers");

function assertBaseGps(record) {
  assert.ok(Math.abs(record.latitude - 19.1383) < 0.0000001);
  assert.ok(Math.abs(record.longitude - 77.321) < 0.0000001);
  assert.strictEqual(record.altitude, 450);
  assert.strictEqual(record.course, 180);
  assert.strictEqual(record.satellites, 9);
  assert.strictEqual(record.speedKmh, 42);
}

function run() {
  const ts = Date.now();
  const imeiFrame = buildImeiHandshakeFrame("864636050000001");
  const handshake = decodeImeiHandshake(imeiFrame);
  assert.strictEqual(handshake.imei, "864636050000001");
  assert.strictEqual(handshake.bytesConsumed, imeiFrame.length);
  console.log("PASS Teltonika IMEI handshake");

  const codec8 = buildTeltonikaPacket({
    codecId: CODEC8,
    lat: 19.1383,
    lng: 77.321,
    alt: 450,
    angle: 180,
    sats: 9,
    speed: 42,
    ignition: true,
    movement: true,
    timestampMs: ts,
    io: {
      21: 4,
      66: { value: 12500, size: 2 },
      67: { value: 3890, size: 2 },
      16: { value: 1234567, size: 4 },
      99: { value: 7, size: 1 },
    },
  });
  const decoded8 = decodeAvlPacket(codec8);
  assert.strictEqual(decoded8.codecId, CODEC8);
  assert.strictEqual(decoded8.crcOk, true);
  assert.strictEqual(decoded8.records.length, 1);
  assertBaseGps(decoded8.records[0]);
  assert.strictEqual(decoded8.records[0].ignition, true);
  assert.strictEqual(decoded8.records[0].movement, true);
  assert.strictEqual(decoded8.records[0].io.gsmSignal, 4);
  assert.strictEqual(decoded8.records[0].io.externalVoltage, 12.5);
  assert.strictEqual(decoded8.records[0].io.batteryVoltage, 3.89);
  assert.strictEqual(decoded8.records[0].io.odometerKm, 1234.567);
  assert.strictEqual(decoded8.records[0].io.elements[99], 7);
  console.log("PASS Codec8 GPS, IO mapping, and unknown IO retention");

  const codec8Extended = buildTeltonikaPacket({
    codecId: CODEC8_EXT,
    lat: 19.1383,
    lng: 77.321,
    alt: 450,
    angle: 180,
    sats: 9,
    speed: 42,
    ignition: false,
    timestampMs: ts,
    io: {
      113: 87,
      199: { value: 543210, size: 4 },
      300: { value: "deadbeef", size: 4, variable: true },
    },
  });
  const decoded8Extended = decodeAvlPacket(codec8Extended);
  assert.strictEqual(decoded8Extended.codecId, CODEC8_EXT);
  assert.strictEqual(decoded8Extended.extended, true);
  assert.strictEqual(decoded8Extended.records[0].ignition, false);
  assert.strictEqual(decoded8Extended.records[0].io.batteryPercent, 87);
  assert.strictEqual(decoded8Extended.records[0].io.tripOdometerKm, 543.21);
  assert.strictEqual(decoded8Extended.records[0].io.elements[300], "deadbeef");
  assert.strictEqual(decoded8Extended.records[0].io.elementMeta[300].encoding, "hex");
  console.log("PASS Codec8 Extended including variable IO");

  const codec16 = buildTeltonikaPacket({
    codecId: CODEC16,
    lat: 19.1383,
    lng: 77.321,
    alt: 450,
    angle: 180,
    sats: 9,
    speed: 42,
    ignition: true,
    eventIoId: 239,
    generationType: 2,
    timestampMs: ts,
    io: {
      66: { value: 12450, size: 2 },
      240: 1,
    },
  });
  const decoded16 = decodeAvlPacket(codec16);
  assert.strictEqual(decoded16.codecId, CODEC16);
  assert.strictEqual(decoded16.codec16, true);
  assert.strictEqual(decoded16.records[0].generationType, 2);
  assert.strictEqual(decoded16.records[0].eventIoId, 239);
  assert.strictEqual(decoded16.records[0].io.externalVoltage, 12.45);
  assert.strictEqual(decoded16.records[0].movement, true);
  console.log("PASS Codec16 event IO and generation type");

  const multi = buildTeltonikaPacket({
    codecId: CODEC8,
    records: [
      {
        lat: 19.1,
        lng: 77.1,
        speed: 10,
        ignition: true,
        timestampMs: ts,
      },
      {
        lat: 19.2,
        lng: 77.2,
        speed: 20,
        ignition: false,
        timestampMs: ts + 1000,
      },
    ],
  });
  const decodedMulti = decodeAvlPacket(multi);
  assert.strictEqual(decodedMulti.records.length, 2);
  assert.strictEqual(decodedMulti.records[1].speedKmh, 20);
  assert.strictEqual(encodeAck(decodedMulti.records.length).readUInt32BE(0), 2);
  console.log("PASS multiple AVL records and ACK count");

  assert.strictEqual(decodeAvlPacket(codec8.subarray(0, 10)), null);
  console.log("PASS partial AVL buffer waits for more data");

  const corrupted = Buffer.from(codec8);
  corrupted[corrupted.length - 1] ^= 0xff;
  assert.strictEqual(decodeAvlPacket(corrupted).crcOk, false);
  assert.strictEqual(encodeAck(0).readUInt32BE(0), 0);
  console.log("PASS CRC fail detection and reject ACK value");

  console.log("\nALL TELTONIKA CODEC TESTS PASSED");
}

run();
