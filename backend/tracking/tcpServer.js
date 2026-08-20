/**
 * TCP server for Teltonika GPS devices (Codec8 / Codec8 Extended).
 *
 * Deliberately decoupled from the database and from server.js's startup
 * logic: it takes plain callback functions (isImeiAuthorized, onPositions)
 * so it can be fully tested with fake in-memory implementations (see
 * tcpServer.test.js) before ever touching Sequelize or real hardware.
 *
 * Protocol flow per connection:
 *   1. Device sends IMEI handshake -> server replies 0x01 (accept) or 0x00 (reject+close)
 *   2. Device sends AVL data packets -> server replies with a 4-byte accepted-record count
 */
const net = require('net');
const { decodeImeiHandshake, decodeAvlPacket, encodeAck } = require('./teltonikaCodec');

const ACCEPT = Buffer.from([0x01]);
const REJECT = Buffer.from([0x00]);

/**
 * @param {object} options
 * @param {(imei: string) => boolean|Promise<boolean>} [options.isImeiAuthorized] - return false to reject+disconnect an unknown device. Defaults to always-authorized.
 * @param {(imei: string, records: object[]) => void|Promise<void>} [options.onPositions] - called with decoded GPS records for a device.
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceConnected]
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceDisconnected]
 * @param {Console} [options.logger]
 * @returns {net.Server} an unstarted net.Server — call .listen(port) yourself
 */
function createTrackingServer({ isImeiAuthorized, onPositions, onDeviceConnected, onDeviceDisconnected, logger = console } = {}) {
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let imei = null;
    let authenticated = false;
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;

    socket.on('data', async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      try {
        // Loop: a single TCP chunk can contain a full handshake AND buffered
        // AVL data, or several AVL packets back to back — drain everything
        // we can fully parse before waiting for the next chunk.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (!authenticated) {
            const handshake = decodeImeiHandshake(buffer);
            if (!handshake) break; // incomplete — wait for more bytes

            imei = handshake.imei;
            buffer = buffer.subarray(handshake.bytesConsumed);

            const authorized = isImeiAuthorized ? await isImeiAuthorized(imei) : true;
            if (!authorized) {
              logger.warn(`[tracking] Rejected unregistered IMEI ${imei} from ${remote}`);
              socket.write(REJECT);
              socket.end();
              return;
            }

            authenticated = true;
            socket.write(ACCEPT);
            logger.log(`[tracking] Device connected: IMEI ${imei} (${remote})`);
            if (onDeviceConnected) onDeviceConnected(imei, remote);
            continue;
          }

          const decoded = decodeAvlPacket(buffer);
          if (!decoded) break; // incomplete — wait for more bytes
          buffer = buffer.subarray(decoded.bytesConsumed);

          if (!decoded.crcOk) {
            logger.warn(`[tracking] CRC mismatch from IMEI ${imei} (${remote}) — packet discarded`);
            socket.write(encodeAck(0)); // tell the device 0 records were accepted so it can retry
            continue;
          }

          if (onPositions) await onPositions(imei, decoded.records);
          socket.write(encodeAck(decoded.records.length));
        }
      } catch (err) {
        logger.error(`[tracking] Protocol error from IMEI ${imei || 'unknown'} (${remote}): ${err.message}`);
        socket.destroy();
      }
    });

    socket.on('error', (err) => {
      logger.error(`[tracking] Socket error (${remote}): ${err.message}`);
    });

    socket.on('close', () => {
      logger.log(`[tracking] Device disconnected: IMEI ${imei || 'unknown'} (${remote})`);
      if (imei && onDeviceDisconnected) onDeviceDisconnected(imei, remote);
    });
  });

  return server;
}

module.exports = { createTrackingServer };
