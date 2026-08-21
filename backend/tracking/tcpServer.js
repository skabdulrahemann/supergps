/**
 * TCP server for GPS devices.
 *
 * Deliberately decoupled from the database and from server.js's startup
 * logic: it takes plain callback functions (isImeiAuthorized, onPositions)
 * so it can be fully tested with fake in-memory implementations before ever
 * touching Sequelize or real hardware.
 *
 * Supported protocols:
 *   - Teltonika Codec8 / Codec8 Extended
 *   - Maharashtra AIS-140 SOP ASCII packets ($NMP/$HLP/$EPB)
 *   - Concox/Jimi GT06-family packets (Iconcox V5-style trackers)
 */
const net = require('net');
const { decodeImeiHandshake, decodeAvlPacket, encodeAck } = require('./teltonikaCodec');
const { decodeMaharashtraPacket, encodeMaharashtraAck, looksLikeMaharashtraPacket } = require('./maharashtraProtocol');
const { decodeGt06Packet, encodeGt06Ack, looksLikeGt06Packet, PROTOCOL_LOGIN } = require('./gt06Protocol');

const ACCEPT = Buffer.from([0x01]);
const REJECT = Buffer.from([0x00]);

/**
 * @param {object} options
 * @param {(imei: string) => boolean|Promise<boolean>} [options.isImeiAuthorized] - return false to reject+disconnect an unknown device. Defaults to always-authorized.
 * @param {(imei: string, records: object[]) => void|Promise<void>} [options.onPositions] - called with decoded GPS records for a device.
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceConnected]
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceDisconnected]
 * @param {Console} [options.logger]
 * @returns {net.Server} an unstarted net.Server - call .listen(port) yourself
 */
function createTrackingServer({ isImeiAuthorized, onPositions, onDeviceConnected, onDeviceDisconnected, logger = console } = {}) {
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let imei = null;
    let authenticated = false;
    let protocol = null;
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;

    socket.on('data', async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      try {
        // A single TCP chunk can contain a login and data packet, or several
        // packets back to back. Drain every complete frame before waiting.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (buffer.length === 0) break;
          if (!protocol) protocol = detectProtocol(buffer);
          if (!protocol) break;

          if (protocol === 'maharashtra') {
            const decoded = decodeMaharashtraPacket(buffer);
            if (!decoded) break;
            buffer = buffer.subarray(decoded.bytesConsumed);

            if (decoded.imei && !authenticated) {
              const accepted = await authorizeDevice(decoded.imei, 'Maharashtra', remote, socket, logger, isImeiAuthorized);
              if (!accepted) return;
              imei = decoded.imei;
              authenticated = true;
              if (onDeviceConnected) onDeviceConnected(imei, remote);
            }

            if (!decoded.crcOk) {
              logger.warn(`[tracking] Maharashtra checksum mismatch from IMEI ${imei || decoded.imei || 'unknown'} (${remote}) - packet discarded`);
              socket.write(encodeMaharashtraAck(false));
              continue;
            }

            if (decoded.records.length > 0 && onPositions) await onPositions(imei || decoded.imei, decoded.records);
            socket.write(encodeMaharashtraAck(true));
            continue;
          }

          if (protocol === 'gt06') {
            const decoded = decodeGt06Packet(buffer);
            if (!decoded) break;
            buffer = buffer.subarray(decoded.bytesConsumed);

            if (!decoded.crcOk) {
              logger.warn(`[tracking] GT06 CRC mismatch from IMEI ${imei || 'unknown'} (${remote}) - packet discarded`);
              continue;
            }

            if (decoded.protocolNumber === PROTOCOL_LOGIN) {
              const accepted = await authorizeDevice(decoded.imei, 'GT06', remote, socket, logger, isImeiAuthorized, false);
              if (!accepted) return;
              imei = decoded.imei;
              authenticated = true;
              socket.write(encodeGt06Ack(decoded.protocolNumber, decoded.serial));
              if (onDeviceConnected) onDeviceConnected(imei, remote);
              continue;
            }

            if (!authenticated) {
              logger.warn(`[tracking] GT06 packet before login from ${remote}`);
              socket.end();
              return;
            }

            if (decoded.records.length > 0 && onPositions) await onPositions(imei, decoded.records);
            socket.write(encodeGt06Ack(decoded.protocolNumber, decoded.serial));
            continue;
          }

          if (!authenticated) {
            const handshake = decodeImeiHandshake(buffer);
            if (!handshake) break;

            const accepted = await authorizeDevice(handshake.imei, 'Teltonika', remote, socket, logger, isImeiAuthorized);
            if (!accepted) return;

            imei = handshake.imei;
            buffer = buffer.subarray(handshake.bytesConsumed);
            authenticated = true;
            socket.write(ACCEPT);
            if (onDeviceConnected) onDeviceConnected(imei, remote);
            continue;
          }

          const decoded = decodeAvlPacket(buffer);
          if (!decoded) break;
          buffer = buffer.subarray(decoded.bytesConsumed);

          if (!decoded.crcOk) {
            logger.warn(`[tracking] Teltonika CRC mismatch from IMEI ${imei} (${remote}) - packet discarded`);
            socket.write(encodeAck(0));
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

function detectProtocol(buffer) {
  if (buffer.length === 0) return null;
  if (looksLikeMaharashtraPacket(buffer)) return 'maharashtra';
  if (looksLikeGt06Packet(buffer)) return 'gt06';
  return 'teltonika';
}

async function authorizeDevice(imei, protocol, remote, socket, logger, isImeiAuthorized, writeRejectByte = true) {
  const authorized = isImeiAuthorized ? await isImeiAuthorized(imei) : true;
  if (!authorized) {
    logger.warn(`[tracking] Rejected unregistered ${protocol} IMEI ${imei} from ${remote}`);
    if (writeRejectByte) socket.write(REJECT);
    socket.end();
    return false;
  }

  logger.log(`[tracking] ${protocol} device connected: IMEI ${imei} (${remote})`);
  return true;
}

module.exports = { createTrackingServer };
