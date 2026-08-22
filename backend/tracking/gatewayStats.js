const protocols = new Map();

function ensureProtocol(protocol) {
  if (!protocols.has(protocol)) {
    protocols.set(protocol, {
      protocol,
      status: "ACTIVE",
      connections: 0,
      packets: 0,
      errors: 0,
      lastPacketAt: null,
      lastErrorAt: null,
    });
  }
  return protocols.get(protocol);
}

function recordConnection(protocol) {
  const stats = ensureProtocol(protocol);
  stats.connections += 1;
}

function recordPacket(protocol) {
  const stats = ensureProtocol(protocol);
  stats.packets += 1;
  stats.lastPacketAt = new Date().toISOString();
}

function recordError(protocol) {
  const stats = ensureProtocol(protocol || "unknown");
  stats.errors += 1;
  stats.lastErrorAt = new Date().toISOString();
}

function snapshot() {
  return Array.from(protocols.values()).sort((a, b) =>
    a.protocol.localeCompare(b.protocol),
  );
}

module.exports = {
  recordConnection,
  recordPacket,
  recordError,
  snapshot,
};
