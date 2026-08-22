/**
 * Integration test for tracking/tcpServer.js using REAL TCP sockets over
 * loopback (127.0.0.1) — a fake "device" client connects the same way a
 * real Teltonika unit would. No mocking of net.Socket; only the
 * isImeiAuthorized / onPositions callbacks are faked (standing in for the
 * database, which gets wired in at Step 4).
 *
 * Run with: node tracking/tcpServer.test.js
 */
const assert = require("assert");
const net = require("net");
const { createTrackingServer } = require("./tcpServer");
const {
  buildImeiHandshakeFrame,
  buildTeltonikaPacket,
  bcdImei,
  buildGt06Packet,
  buildGt06Location,
  buildGt06Heartbeat,
} = require("./testHelpers");
const {
  PROTOCOL_LOGIN,
  PROTOCOL_LOCATION,
  PROTOCOL_HEARTBEAT,
} = require("./gt06Protocol");
const { withChecksum } = require("./multiProtocol.test");

const KNOWN_IMEI = "864636050000001";
const UNKNOWN_IMEI = "999999999999999";

function startServer(handlers) {
  return new Promise((resolve) => {
    const server = createTrackingServer({
      logger: { log() {}, warn() {}, error() {} },
      ...handlers,
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function connect(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () =>
      resolve(socket),
    );
    socket.on("error", reject);
  });
}

function waitForBytes(socket, n) {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= n) {
        socket.off("data", onData);
        resolve(buf.subarray(0, n));
      }
    };
    socket.on("data", onData);
  });
}

async function testAcceptedDeviceFlow() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;

  const socket = await connect(port);

  // 1. Send IMEI handshake, expect 1-byte ACCEPT
  socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
  const acceptByte = await waitForBytes(socket, 1);
  assert.strictEqual(
    acceptByte[0],
    0x01,
    "expected ACCEPT byte after known IMEI",
  );
  console.log("✓ Known IMEI accepted (0x01)");

  // 2. Send an AVL packet, expect 4-byte ACK with record count = 1
  const packet = buildTeltonikaPacket({
    lat: 19.1383,
    lng: 77.321,
    speed: 42,
    ignition: true,
  });
  socket.write(packet);
  const ack = await waitForBytes(socket, 4);
  assert.strictEqual(ack.readUInt32BE(0), 1, "expected ACK for 1 record");
  console.log("✓ AVL packet acknowledged with correct record count");

  // 3. Verify the server actually delivered the decoded position to our callback
  await new Promise((r) => setTimeout(r, 50)); // let the async onPositions callback settle
  assert.strictEqual(receivedPositions.length, 1);
  assert.strictEqual(receivedPositions[0].imei, KNOWN_IMEI);
  assert.strictEqual(receivedPositions[0].records.length, 1);
  assert.ok(
    Math.abs(receivedPositions[0].records[0].latitude - 19.1383) < 0.0000001,
  );
  console.log(
    "✓ Decoded position delivered to onPositions callback with correct values",
  );

  // 4. Send a second packet on the SAME connection to confirm re-authentication isn't required
  const packet2 = buildTeltonikaPacket({
    lat: 19.14,
    lng: 77.33,
    speed: 10,
    ignition: false,
  });
  socket.write(packet2);
  const ack2 = await waitForBytes(socket, 4);
  assert.strictEqual(ack2.readUInt32BE(0), 1);
  console.log(
    "✓ Second packet on same connection handled without re-handshake",
  );

  socket.end();
  await closeServer(server);
}

async function testUnknownDeviceRejected() {
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: () => {
      throw new Error("should never be called for an unauthorized device");
    },
  });
  const port = server.address().port;

  const socket = await connect(port);
  socket.write(buildImeiHandshakeFrame(UNKNOWN_IMEI));
  const rejectByte = await waitForBytes(socket, 1);
  assert.strictEqual(
    rejectByte[0],
    0x00,
    "expected REJECT byte for unknown IMEI",
  );
  console.log("✓ Unknown IMEI rejected (0x00)");

  await new Promise((resolve) => socket.on("close", resolve));
  console.log("✓ Connection closed after rejection");

  await closeServer(server);
}

async function testChunkedTcpStream() {
  // Real TCP doesn't guarantee message boundaries — split a single packet
  // across two separate .write() calls to make sure the server's buffering
  // logic waits for the rest instead of crashing on a truncated packet.
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: () => true,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;
  const socket = await connect(port);

  socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
  await waitForBytes(socket, 1);

  const packet = buildTeltonikaPacket({ lat: 20.0, lng: 78.0, speed: 5 });
  const half = Math.floor(packet.length / 2);
  socket.write(packet.subarray(0, half));
  await new Promise((r) => setTimeout(r, 30)); // give server a moment — it must NOT error on the partial chunk
  socket.write(packet.subarray(half));

  const ack = await waitForBytes(socket, 4);
  assert.strictEqual(ack.readUInt32BE(0), 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 1);
  assert.ok(
    Math.abs(receivedPositions[0].records[0].latitude - 20.0) < 0.0000001,
  );
  console.log(
    "✓ Packet split across two TCP writes is still decoded correctly",
  );

  socket.end();
  await closeServer(server);
}

async function testTeltonikaMultipleRecordsAndPackets() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: () => true,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;
  const socket = await connect(port);

  socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
  await waitForBytes(socket, 1);

  const multiRecordPacket = buildTeltonikaPacket({
    records: [
      { lat: 19.1, lng: 77.1, speed: 11, ignition: true },
      { lat: 19.2, lng: 77.2, speed: 22, ignition: false },
    ],
  });
  const packet2 = buildTeltonikaPacket({
    lat: 19.3,
    lng: 77.3,
    speed: 33,
    ignition: true,
  });
  socket.write(Buffer.concat([multiRecordPacket, packet2]));

  const acks = await waitForBytes(socket, 8);
  assert.strictEqual(acks.readUInt32BE(0), 2);
  assert.strictEqual(acks.readUInt32BE(4), 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 2);
  assert.strictEqual(receivedPositions[0].records.length, 2);
  assert.strictEqual(receivedPositions[1].records.length, 1);
  assert.strictEqual(receivedPositions[0].records[1].speedKmh, 22);
  console.log("PASS Teltonika multiple AVL records and multiple packets in one chunk");

  socket.end();
  await closeServer(server);
}

async function testTeltonikaReconnect() {
  const connected = [];
  const disconnected = [];
  const server = await startServer({
    isImeiAuthorized: () => true,
    onDeviceConnected: (imei) => connected.push(imei),
    onDeviceDisconnected: (imei) => disconnected.push(imei),
    onPositions: () => {},
  });
  const port = server.address().port;

  for (let i = 0; i < 2; i++) {
    const socket = await connect(port);
    socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
    const accept = await waitForBytes(socket, 1);
    assert.strictEqual(accept[0], 0x01);
    socket.end();
    await new Promise((resolve) => socket.on("close", resolve));
  }

  assert.deepStrictEqual(connected, [KNOWN_IMEI, KNOWN_IMEI]);
  assert.strictEqual(disconnected.length, 2);
  console.log("PASS Teltonika reconnect/session handling");

  await closeServer(server);
}

async function testTeltonikaOnlyListener() {
  const receivedPositions = [];
  const server = await startServer({
    allowedProtocols: ["teltonika"],
    isImeiAuthorized: () => true,
    onPositions: (imei, records) => receivedPositions.push({ imei, records }),
  });
  const port = server.address().port;
  const socket = await connect(port);

  socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
  const accept = await waitForBytes(socket, 1);
  assert.strictEqual(accept[0], 0x01);
  socket.write(buildTeltonikaPacket({ lat: 21, lng: 78, speed: 12 }));
  const ack = await waitForBytes(socket, 4);
  assert.strictEqual(ack.readUInt32BE(0), 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 1);
  console.log("PASS configurable Teltonika-only listener");

  socket.end();
  await closeServer(server);
}

async function testMaharashtraPacketFlow() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;
  const socket = await connect(port);

  const payload = [
    "NMP",
    "ABCD01A",
    "1.6.5",
    "NR",
    "1",
    "L",
    KNOWN_IMEI,
    "MH01PB0000",
    "1",
    "24032019",
    "060122",
    "19.1383000",
    "N",
    "77.3210000",
    "E",
    "022.5",
    "320.55",
    "08",
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

  socket.write(Buffer.from(`${withChecksum(payload)}\r\n`, "ascii"));
  const ack = await waitForBytes(socket, 5);
  assert.strictEqual(ack.toString("ascii"), "ACK\r\n");

  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 1);
  assert.strictEqual(receivedPositions[0].imei, KNOWN_IMEI);
  assert.ok(
    Math.abs(receivedPositions[0].records[0].latitude - 19.1383) < 0.0000001,
  );
  assert.strictEqual(receivedPositions[0].records[0].ignition, true);
  console.log("OK Maharashtra NMP packet accepted over TCP");

  socket.end();
  await closeServer(server);
}

async function testGt06PacketFlow() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;
  const socket = await connect(port);

  socket.write(buildGt06Packet(PROTOCOL_LOGIN, bcdImei(KNOWN_IMEI), 3));
  const loginAck = await waitForBytes(socket, 10);
  assert.strictEqual(loginAck.subarray(0, 2).toString("hex"), "7878");
  assert.strictEqual(loginAck[3], PROTOCOL_LOGIN);
  console.log("OK GT06 login accepted over TCP");

  socket.write(
    buildGt06Packet(
      PROTOCOL_LOCATION,
      buildGt06Location({ lat: 19.1383, lng: 77.321, speed: 42 }),
      4,
    ),
  );
  const locationAck = await waitForBytes(socket, 10);
  assert.strictEqual(locationAck[3], PROTOCOL_LOCATION);

  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 1);
  assert.strictEqual(receivedPositions[0].imei, KNOWN_IMEI);
  assert.ok(
    Math.abs(receivedPositions[0].records[0].longitude - 77.321) < 0.000001,
  );
  console.log("OK GT06 location packet accepted over TCP");

  socket.end();
  await closeServer(server);
}

async function testGt06FragmentedAndMultiplePackets() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: (imei, records) => {
      receivedPositions.push({ imei, records });
    },
  });
  const port = server.address().port;
  const socket = await connect(port);

  const login = buildGt06Packet(PROTOCOL_LOGIN, bcdImei(KNOWN_IMEI), 11);
  socket.write(login.subarray(0, 4));
  await new Promise((r) => setTimeout(r, 25));
  socket.write(login.subarray(4));
  const loginAck = await waitForBytes(socket, 10);
  assert.strictEqual(loginAck[3], PROTOCOL_LOGIN);
  console.log("PASS GT06 fragmented login packet");

  const location = buildGt06Packet(
    PROTOCOL_LOCATION,
    buildGt06Location({ lat: 19.1383, lng: 77.321 }),
    12,
  );
  const heartbeat = buildGt06Packet(
    PROTOCOL_HEARTBEAT,
    buildGt06Heartbeat(),
    13,
  );
  socket.write(Buffer.concat([location, heartbeat]));
  const combinedAck = await waitForBytes(socket, 20);
  assert.strictEqual(combinedAck[3], PROTOCOL_LOCATION);
  assert.strictEqual(combinedAck[13], PROTOCOL_HEARTBEAT);

  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(receivedPositions.length, 1);
  assert.ok(
    Math.abs(receivedPositions[0].records[0].latitude - 19.1383) < 0.000001,
  );
  console.log("PASS GT06 multiple TCP packets in one chunk");

  socket.end();
  await closeServer(server);
}

async function run() {
  await testAcceptedDeviceFlow();
  await testUnknownDeviceRejected();
  await testChunkedTcpStream();
  await testTeltonikaMultipleRecordsAndPackets();
  await testTeltonikaReconnect();
  await testTeltonikaOnlyListener();
  await testMaharashtraPacketFlow();
  await testGt06PacketFlow();
  await testGt06FragmentedAndMultiplePackets();
  console.log("\nALL TCP SERVER TESTS PASSED ✅");
  process.exit(0);
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
