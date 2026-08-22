const assert = require("assert");
const { decodeH02Packet } = require("./h02Protocol");

function run() {
  const imei = "135790246811220";

  const login = decodeH02Packet(Buffer.from(`*HQ,${imei},V0#`, "ascii"));
  assert.strictEqual(login.imei, imei);
  assert.strictEqual(login.type, "V0");
  assert.strictEqual(login.records.length, 0);
  assert.strictEqual(login.ack.toString("ascii"), `*HQ,${imei},V0#`);
  console.log("PASS H02 login ACK");

  const heartbeat = decodeH02Packet(Buffer.from(`*HQ,${imei},HTBT,100#`, "ascii"));
  assert.strictEqual(heartbeat.type, "HTBT");
  assert.strictEqual(heartbeat.ack.toString("ascii"), `*HQ,${imei},HTBT#`);
  console.log("PASS H02 heartbeat ACK");

  const location = decodeH02Packet(Buffer.from(
    `*HQ,${imei},V1,120000,A,2232.1234,N,07234.5678,E,60,180,5,220826,FFFFFFFF#`,
    "ascii",
  ));
  assert.strictEqual(location.type, "V1");
  assert.strictEqual(location.records.length, 1);
  const record = location.records[0];
  assert.strictEqual(record.protocol, "h02");
  assert.ok(Math.abs(record.latitude - 22.53539) < 0.00001);
  assert.ok(Math.abs(record.longitude - 72.57613) < 0.00001);
  assert.strictEqual(record.speedKmh, 60);
  assert.strictEqual(record.course, 180);
  assert.strictEqual(record.ignition, true);
  assert.strictEqual(record.timestamp.toISOString(), "2026-08-22T12:00:00.000Z");
  console.log("PASS H02 location decode");

  const partial = decodeH02Packet(Buffer.from(`*HQ,${imei},V1,120000`, "ascii"));
  assert.strictEqual(partial, null);
  console.log("PASS H02 partial frame waits for more data");

  console.log("\nALL H02 PROTOCOL TESTS PASSED");
}

run();
