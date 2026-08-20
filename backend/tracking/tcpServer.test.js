/**
 * Integration test for tracking/tcpServer.js using REAL TCP sockets over
 * loopback (127.0.0.1) — a fake "device" client connects the same way a
 * real Teltonika unit would. No mocking of net.Socket; only the
 * isImeiAuthorized / onPositions callbacks are faked (standing in for the
 * database, which gets wired in at Step 4).
 *
 * Run with: node tracking/tcpServer.test.js
 */
const assert = require('assert');
const net = require('net');
const { createTrackingServer } = require('./tcpServer');
const { buildImeiHandshakeFrame, buildTeltonikaPacket } = require('./testHelpers');

const KNOWN_IMEI = '864636050000001';
const UNKNOWN_IMEI = '999999999999999';

function startServer(handlers) {
  return new Promise((resolve) => {
    const server = createTrackingServer({ logger: { log() {}, warn() {}, error() {} }, ...handlers });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function connect(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => resolve(socket));
    socket.on('error', reject);
  });
}

function waitForBytes(socket, n) {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= n) {
        socket.off('data', onData);
        resolve(buf.subarray(0, n));
      }
    };
    socket.on('data', onData);
  });
}

async function testAcceptedDeviceFlow() {
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: (imei, records) => { receivedPositions.push({ imei, records }); },
  });
  const port = server.address().port;

  const socket = await connect(port);

  // 1. Send IMEI handshake, expect 1-byte ACCEPT
  socket.write(buildImeiHandshakeFrame(KNOWN_IMEI));
  const acceptByte = await waitForBytes(socket, 1);
  assert.strictEqual(acceptByte[0], 0x01, 'expected ACCEPT byte after known IMEI');
  console.log('✓ Known IMEI accepted (0x01)');

  // 2. Send an AVL packet, expect 4-byte ACK with record count = 1
  const packet = buildTeltonikaPacket({ lat: 19.1383, lng: 77.3210, speed: 42, ignition: true });
  socket.write(packet);
  const ack = await waitForBytes(socket, 4);
  assert.strictEqual(ack.readUInt32BE(0), 1, 'expected ACK for 1 record');
  console.log('✓ AVL packet acknowledged with correct record count');

  // 3. Verify the server actually delivered the decoded position to our callback
  await new Promise((r) => setTimeout(r, 50)); // let the async onPositions callback settle
  assert.strictEqual(receivedPositions.length, 1);
  assert.strictEqual(receivedPositions[0].imei, KNOWN_IMEI);
  assert.strictEqual(receivedPositions[0].records.length, 1);
  assert.ok(Math.abs(receivedPositions[0].records[0].latitude - 19.1383) < 0.0000001);
  console.log('✓ Decoded position delivered to onPositions callback with correct values');

  // 4. Send a second packet on the SAME connection to confirm re-authentication isn't required
  const packet2 = buildTeltonikaPacket({ lat: 19.14, lng: 77.33, speed: 10, ignition: false });
  socket.write(packet2);
  const ack2 = await waitForBytes(socket, 4);
  assert.strictEqual(ack2.readUInt32BE(0), 1);
  console.log('✓ Second packet on same connection handled without re-handshake');

  socket.end();
  server.close();
}

async function testUnknownDeviceRejected() {
  const server = await startServer({
    isImeiAuthorized: (imei) => imei === KNOWN_IMEI,
    onPositions: () => { throw new Error('should never be called for an unauthorized device'); },
  });
  const port = server.address().port;

  const socket = await connect(port);
  socket.write(buildImeiHandshakeFrame(UNKNOWN_IMEI));
  const rejectByte = await waitForBytes(socket, 1);
  assert.strictEqual(rejectByte[0], 0x00, 'expected REJECT byte for unknown IMEI');
  console.log('✓ Unknown IMEI rejected (0x00)');

  await new Promise((resolve) => socket.on('close', resolve));
  console.log('✓ Connection closed after rejection');

  server.close();
}

async function testChunkedTcpStream() {
  // Real TCP doesn't guarantee message boundaries — split a single packet
  // across two separate .write() calls to make sure the server's buffering
  // logic waits for the rest instead of crashing on a truncated packet.
  const receivedPositions = [];
  const server = await startServer({
    isImeiAuthorized: () => true,
    onPositions: (imei, records) => { receivedPositions.push({ imei, records }); },
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
  assert.ok(Math.abs(receivedPositions[0].records[0].latitude - 20.0) < 0.0000001);
  console.log('✓ Packet split across two TCP writes is still decoded correctly');

  socket.end();
  server.close();
}

async function run() {
  await testAcceptedDeviceFlow();
  await testUnknownDeviceRejected();
  await testChunkedTcpStream();
  console.log('\nALL TCP SERVER TESTS PASSED ✅');
  process.exit(0);
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
