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
const net = require("net");
const {
  decodeImeiHandshake,
  decodeAvlPacket,
  encodeAck,
} = require("./teltonikaCodec");
const {
  decodeMaharashtraPacket,
  encodeMaharashtraAck,
  looksLikeMaharashtraPacket,
} = require("./maharashtraProtocol");
const {
  decodeGt06Packet,
  encodeGt06Ack,
  looksLikeGt06Packet,
  PROTOCOL_LOGIN,
} = require("./gt06Protocol");
const gatewayStats = require("./gatewayStats");

const ACCEPT = Buffer.from([0x01]);
const REJECT = Buffer.from([0x00]);
const MAX_BUFFER_BYTES = Number(
  process.env.TRACKING_MAX_BUFFER_BYTES || 64 * 1024,
);
const RAW_LOGGING = process.env.TRACKING_RAW_LOGGING === "true";

/**
 * @param {object} options
 * @param {(imei: string) => boolean|Promise<boolean>} [options.isImeiAuthorized] - return false to reject+disconnect an unknown device. Defaults to always-authorized.
 * @param {(imei: string, records: object[]) => void|Promise<void>} [options.onPositions] - called with decoded GPS records for a device.
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceConnected]
 * @param {(imei: string, remoteAddr: string) => void} [options.onDeviceDisconnected]
 * @param {string[]} [options.allowedProtocols]
 * @param {Console} [options.logger]
 * @returns {net.Server} an unstarted net.Server - call .listen(port) yourself
 */
function createTrackingServer({
  isImeiAuthorized,
  onPositions,
  onDeviceConnected,
  onDeviceDisconnected,
  allowedProtocols = ["maharashtra", "gt06", "teltonika"],
  logger = console,
} = {}) {
  const protocolSet = new Set(allowedProtocols);
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let imei = null;
    let authenticated = false;
    let protocol = null;
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;

    socket.on("data", async (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (RAW_LOGGING)
        logger.log(`[GPS RX] Remote: ${remote} HEX: ${chunk.toString("hex")}`);

      if (buffer.length > MAX_BUFFER_BYTES) {
        logger.warn(
          `[tracking] Oversized GPS buffer from ${remote} (${buffer.length} bytes) - closing connection`,
        );
        socket.destroy();
        return;
      }

      try {
        // A single TCP chunk can contain a login and data packet, or several
        // packets back to back. Drain every complete frame before waiting.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (buffer.length === 0) break;
          if (!protocol) protocol = detectProtocol(buffer, protocolSet);
          if (!protocol) break;

          if (protocol === "maharashtra") {
            const decoded = decodeMaharashtraPacket(buffer);
            if (!decoded) break;
            buffer = buffer.subarray(decoded.bytesConsumed);

            if (decoded.imei && !authenticated) {
              const accepted = await authorizeDevice(
                decoded.imei,
                "Maharashtra",
                remote,
                socket,
                logger,
                isImeiAuthorized,
              );
              if (!accepted) return;
              imei = decoded.imei;
              authenticated = true;
              gatewayStats.recordConnection("maharashtra");
              if (onDeviceConnected) onDeviceConnected(imei, remote);
            }

            if (!decoded.crcOk) {
              gatewayStats.recordError("maharashtra");
              logger.warn(
                `[tracking] Maharashtra checksum mismatch from IMEI ${imei || decoded.imei || "unknown"} (${remote}) - packet discarded`,
              );
              socket.write(encodeMaharashtraAck(false));
              continue;
            }

            gatewayStats.recordPacket("maharashtra");
            if (decoded.records.length > 0 && onPositions)
              await onPositions(imei || decoded.imei, decoded.records);
            socket.write(encodeMaharashtraAck(true));
            continue;
          }

          if (protocol === "gt06") {
            const decoded = decodeGt06Packet(buffer);
            if (!decoded) break;
            buffer = buffer.subarray(decoded.bytesConsumed);

            if (!decoded.crcOk) {
              gatewayStats.recordError("gt06");
              logger.warn(
                `[tracking] GT06 CRC mismatch from IMEI ${imei || "unknown"} (${remote}) - packet discarded`,
              );
              continue;
            }
            logger.log(
              `[GPS DECODE] Protocol: gt06 IMEI: ${imei || decoded.imei || "pending"} Type: ${decoded.packetType}`,
            );
            gatewayStats.recordPacket("gt06");

            if (decoded.protocolNumber === PROTOCOL_LOGIN) {
              const accepted = await authorizeDevice(
                decoded.imei,
                "GT06",
                remote,
                socket,
                logger,
                isImeiAuthorized,
                false,
              );
              if (!accepted) return;
              imei = decoded.imei;
              authenticated = true;
              gatewayStats.recordConnection("gt06");
              writePacket(
                socket,
                encodeGt06Ack(decoded.protocolNumber, decoded.serial),
                logger,
                "GT06 login ACK",
              );
              if (onDeviceConnected) onDeviceConnected(imei, remote);
              continue;
            }

            if (!authenticated) {
              logger.warn(`[tracking] GT06 packet before login from ${remote}`);
              socket.end();
              return;
            }

            if (decoded.records.length > 0 && onPositions)
              await onPositions(imei, decoded.records);
            writePacket(
              socket,
              encodeGt06Ack(decoded.protocolNumber, decoded.serial),
              logger,
              "GT06 ACK",
            );
            continue;
          }

          if (!authenticated) {
            const handshake = decodeImeiHandshake(buffer);
            if (!handshake) break;

            const accepted = await authorizeDevice(
              handshake.imei,
              "Teltonika",
              remote,
              socket,
              logger,
              isImeiAuthorized,
            );
            if (!accepted) return;

            imei = handshake.imei;
            buffer = buffer.subarray(handshake.bytesConsumed);
            authenticated = true;
            gatewayStats.recordConnection("teltonika");
            writePacket(socket, ACCEPT, logger, "Teltonika accept");
            if (onDeviceConnected) onDeviceConnected(imei, remote);
            continue;
          }

          const decoded = decodeAvlPacket(buffer);
          if (!decoded) break;
          buffer = buffer.subarray(decoded.bytesConsumed);

          if (!decoded.crcOk) {
            gatewayStats.recordError("teltonika");
            logger.warn(
              `[tracking] Teltonika CRC mismatch from IMEI ${imei} (${remote}) - packet discarded`,
            );
            writePacket(socket, encodeAck(0), logger, "Teltonika reject ACK");
            continue;
          }

          gatewayStats.recordPacket("teltonika");
          if (onPositions) await onPositions(imei, decoded.records);
          writePacket(
            socket,
            encodeAck(decoded.records.length),
            logger,
            "Teltonika AVL ACK",
          );
        }
      } catch (err) {
        gatewayStats.recordError(protocol);
        logger.error(
          `[tracking] Protocol error from IMEI ${imei || "unknown"} (${remote}): ${err.message}`,
        );
        socket.destroy();
      }
    });

    socket.on("error", (err) => {
      logger.error(`[tracking] Socket error (${remote}): ${err.message}`);
    });

    socket.on("close", () => {
      logger.log(
        `[tracking] Device disconnected: IMEI ${imei || "unknown"} (${remote})`,
      );
      if (imei && onDeviceDisconnected) onDeviceDisconnected(imei, remote);
    });
  });

  return server;
}

function writePacket(socket, packet, logger, label) {
  if (RAW_LOGGING) logger.log(`[GPS TX] ${label}: ${packet.toString("hex")}`);
  socket.write(packet);
}

function detectProtocol(buffer, allowedProtocols) {
  if (buffer.length === 0) return null;
  if (looksLikeMaharashtraPacket(buffer)) {
    return allowedProtocols.has("maharashtra") ? "maharashtra" : null;
  }
  if (looksLikeGt06Packet(buffer)) {
    return allowedProtocols.has("gt06") ? "gt06" : null;
  }
  return allowedProtocols.has("teltonika") ? "teltonika" : null;
}

async function authorizeDevice(
  imei,
  protocol,
  remote,
  socket,
  logger,
  isImeiAuthorized,
  writeRejectByte = true,
) {
  const authorized = isImeiAuthorized ? await isImeiAuthorized(imei) : true;
  if (!authorized) {
    logger.warn(
      `[tracking] Rejected unregistered ${protocol} IMEI ${imei} from ${remote}`,
    );
    if (writeRejectByte) socket.write(REJECT);
    socket.end();
    return false;
  }

  logger.log(
    `[tracking] ${protocol} device connected: IMEI ${imei} (${remote})`,
  );
  return true;
}

module.exports = { createTrackingServer };
