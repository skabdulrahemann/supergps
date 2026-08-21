/**
 * Maharashtra AIS-140 SOP ASCII packet parser.
 *
 * Supports the packet families shown in "MH Protocol As per New SOP.pdf":
 *   $NMP - normal / alert location packets
 *   $HLP - health packets (acknowledged, no GPS record emitted)
 *   $EPB - emergency button packets
 */

const POSITION_HEADERS = new Set(['NMP', 'EPB']);

function looksLikeMaharashtraPacket(buffer) {
  return buffer.length > 0 && buffer[0] === 0x24; // "$"
}

function decodeMaharashtraPacket(buffer) {
  const start = buffer.indexOf(0x24);
  if (start < 0) {
    return { bytesConsumed: buffer.length, records: [], crcOk: true, imei: null, packetType: null };
  }

  if (start > 0) {
    return { bytesConsumed: start, records: [], crcOk: true, imei: null, packetType: null };
  }

  const end = findPacketEnd(buffer);
  if (end < 0) return null;

  const frame = buffer.toString('ascii', 0, end).trim();
  const parsed = parseFrame(frame);

  return {
    ...parsed,
    bytesConsumed: end,
  };
}

function findPacketEnd(buffer) {
  const newline = firstNewline(buffer);
  if (newline >= 0) return newline + 1;

  const checksumAt = findChecksum(buffer);
  if (checksumAt >= 0) return checksumAt + 3;

  return -1;
}

function firstNewline(buffer) {
  const lf = buffer.indexOf(0x0a);
  const cr = buffer.indexOf(0x0d);
  if (lf < 0) return cr;
  if (cr < 0) return lf;
  return Math.min(lf, cr);
}

function findChecksum(buffer) {
  for (let i = 1; i <= buffer.length - 3; i++) {
    if (buffer[i] === 0x2a && isHex(buffer[i + 1]) && isHex(buffer[i + 2])) return i;
  }
  return -1;
}

function isHex(byte) {
  return (byte >= 0x30 && byte <= 0x39)
    || (byte >= 0x41 && byte <= 0x46)
    || (byte >= 0x61 && byte <= 0x66);
}

function parseFrame(frame) {
  const checksumIndex = frame.lastIndexOf('*');
  const withoutStart = frame.startsWith('$') ? frame.slice(1) : frame;
  const payload = checksumIndex >= 0 ? frame.slice(1, checksumIndex) : withoutStart;
  const checksumText = checksumIndex >= 0 ? frame.slice(checksumIndex + 1, checksumIndex + 3) : null;
  const fields = payload.split(',').map((field) => field.trim());
  const header = fields[0];

  if (!header) throw new Error('Maharashtra packet missing header');
  if (!['NMP', 'HLP', 'EPB'].includes(header)) {
    throw new Error(`Unsupported Maharashtra packet header: ${header}`);
  }

  const crcOk = checksumText ? xorChecksum(payload) === Number.parseInt(checksumText, 16) : true;
  const imei = extractImei(header, fields);
  const records = POSITION_HEADERS.has(header) ? [parsePositionRecord(header, fields)] : [];

  return {
    protocol: 'maharashtra-ais140',
    packetType: header,
    imei,
    records,
    crcOk,
    raw: fields,
  };
}

function extractImei(header, fields) {
  if (header === 'NMP') return fields[6] || null;
  if (header === 'HLP') return fields[3] || null;
  if (header === 'EPB') return fields[2] || null;
  return null;
}

function parsePositionRecord(header, fields) {
  if (header === 'NMP') {
    return {
      timestamp: parseDateTime(fields[9], fields[10]),
      priority: fields[3] || null,
      latitude: parseCoordinate(fields[11], fields[12]),
      longitude: parseCoordinate(fields[13], fields[14]),
      altitude: parseNumber(fields[18]),
      course: parseNumber(fields[16]),
      satellites: parseInteger(fields[17]),
      speedKmh: parseNumber(fields[15]),
      ignition: parseBoolean01(fields[22]),
      io: {
        alertId: fields[4] || null,
        packetStatus: fields[5] || null,
        vehicleRegNo: fields[7] || null,
        gpsFix: fields[8] || null,
        pdop: parseNumber(fields[19]),
        hdop: parseNumber(fields[20]),
        networkOperator: fields[21] || null,
        mainPowerStatus: parseBoolean01(fields[23]),
        mainInputVoltage: parseNumber(fields[24]),
        internalBatteryVoltage: parseNumber(fields[25]),
        emergencyStatus: parseBoolean01(fields[26]),
        tamper: fields[27] || null,
        gsmSignalStrength: parseInteger(fields[28]),
      },
    };
  }

  return {
    timestamp: parseCompactDateTime(fields[4]),
    priority: fields[1] || null,
    latitude: parseCoordinate(fields[6], fields[7]),
    longitude: parseCoordinate(fields[8], fields[9]),
    altitude: parseNumber(fields[10]),
    course: null,
    satellites: null,
    speedKmh: parseNumber(fields[11]),
    ignition: null,
    io: {
      packetStatus: fields[3] || null,
      gpsValidity: fields[5] || null,
      provider: fields[12] || null,
      distanceMeters: parseNumber(fields[13]),
      vehicleRegNo: fields[14] || null,
      replyNumber: fields[15] || null,
    },
  };
}

function parseCoordinate(value, direction) {
  const number = parseNumber(value);
  if (!Number.isFinite(number)) return NaN;
  return ['S', 'W'].includes(String(direction).toUpperCase()) ? -number : number;
}

function parseDateTime(date, time) {
  if (!/^\d{8}$/.test(date || '') || !/^\d{6}$/.test(time || '')) return new Date();
  const day = Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4)) - 1;
  const year = Number(date.slice(4, 8));
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const second = Number(time.slice(4, 6));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function parseCompactDateTime(value) {
  if (!/^\d{14}$/.test(value || '')) return new Date();
  return parseDateTime(value.slice(0, 8), value.slice(8, 14));
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '' || String(value).toUpperCase() === 'X') return null;
  const number = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function parseBoolean01(value) {
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

function xorChecksum(payload) {
  let checksum = 0;
  for (let i = 0; i < payload.length; i++) checksum ^= payload.charCodeAt(i);
  return checksum;
}

function encodeMaharashtraAck() {
  return Buffer.from('ACK\r\n', 'ascii');
}

module.exports = {
  decodeMaharashtraPacket,
  encodeMaharashtraAck,
  looksLikeMaharashtraPacket,
  xorChecksum,
};
