/**
 * H02 / Sinotrack-style ASCII protocol parser.
 *
 * Traccar reference: H02Protocol.java + H02ProtocolDecoder.java. This is a
 * native Node.js implementation for SuperGPS; no Java code is copied.
 */

function looksLikeH02Packet(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return buffer[0] === 0x2a; // *
}

function decodeH02Packet(buffer) {
  const start = buffer.indexOf(0x2a); // *
  if (start < 0) return null;
  if (start > 0) {
    return { bytesConsumed: start, records: [], discarded: true };
  }

  const end = buffer.indexOf(0x23, start); // #
  if (end < 0) return null;

  const sentence = buffer.toString("ascii", start, end + 1).trim();
  const fields = sentence.slice(1, -1).split(",");
  if (fields.length < 3) {
    throw new Error(`Invalid H02 frame: ${sentence}`);
  }

  const manufacturer = fields[0];
  const imei = fields[1];
  const type = fields[2];
  const raw = { manufacturer, type, fields };
  const ack = encodeH02Ack(imei, type);
  const records = [];

  if (type === "V0" || type === "HTBT") {
    return {
      protocol: "h02",
      imei,
      type,
      records,
      ack,
      raw,
      bytesConsumed: end + 1,
    };
  }

  const record = decodeLocationFields(fields, raw);
  if (record) records.push(record);

  return {
    protocol: "h02",
    imei,
    type,
    records,
    ack: null,
    raw,
    bytesConsumed: end + 1,
  };
}

function decodeLocationFields(fields, raw) {
  const type = fields[2];
  if (type === "LINK") return decodeLink(fields, raw);
  if (type === "VP1") return decodeVp1(fields, raw);
  if (type === "NBR" || type === "SMS" || type === "V3") return null;

  const timeIndex = 3;
  const timeText = fields[timeIndex] || "";
  let index = timeIndex + 1;

  let valid = true;
  if (["A", "B", "V"].includes(fields[index])) {
    valid = fields[index] === "A";
    index += 1;
  } else if (/^\d+$/.test(fields[index] || "")) {
    valid = true;
    index += 1;
  }

  const lat = parseCoordinate(fields[index], fields[index + 1], false);
  index += 2;
  const lng = parseCoordinate(fields[index], fields[index + 1], true);
  index += 2;
  if (lat === null || lng === null) return null;

  const speedKmh = toNumber(fields[index], 0);
  index += 1;
  const course = toNumber(fields[index], 0);
  index += 1;

  if (/^\d+$/.test(fields[index] || "")) index += 1; // battery/coding, model-dependent
  const timestamp = parseDateTime(fields[index], timeText) || new Date();
  if (/^\d{6}$/.test(fields[index] || "")) index += 1;

  let status = null;
  let ignition = null;
  let alarm = null;
  let altitude = null;
  let odometer = null;
  const io = { elements: {}, rawFields: fields.slice(index) };

  const statusIndex = fields.findIndex((value, fieldIndex) =>
    fieldIndex >= index && /^[0-9a-fA-F]{8}$/.test(value || ""),
  );
  if (statusIndex >= 0) {
    status = Number.parseInt(fields[statusIndex], 16);
    ignition = Boolean(status & (1 << 10));
    alarm = alarmFromStatus(status);
    io.status = status;
    index = statusIndex + 1;
  }

  if (fields.length >= index + 6) {
    odometer = toNumber(fields[index], null);
    io.temperature = toNumber(fields[index + 1], null);
    io.fuel = toNumber(fields[index + 2], null);
    altitude = toNumber(fields[index + 3], null);
    io.lac = fields[index + 4] || null;
    io.cid = fields[index + 5] || null;
  }

  return {
    protocol: "h02",
    timestamp,
    latitude: lat,
    longitude: lng,
    altitude,
    course,
    satellites: null,
    speedKmh,
    ignition,
    gpsValid: valid,
    alarm,
    io: {
      ...io,
      odometer,
      type,
      sentence: raw.fields.join(","),
    },
  };
}

function decodeLink(fields, raw) {
  const timestamp = parseDateTime(fields[8], fields[3]) || new Date();
  return {
    protocol: "h02",
    timestamp,
    latitude: NaN,
    longitude: NaN,
    speedKmh: 0,
    course: 0,
    satellites: toInteger(fields[5], null),
    ignition: null,
    gpsValid: false,
    io: {
      type: "LINK",
      rssi: toInteger(fields[4], null),
      batteryPercent: toInteger(fields[6], null),
      steps: toInteger(fields[7], null),
      status: fields[9] ? Number.parseInt(fields[9], 16) : null,
      sentence: raw.fields.join(","),
    },
  };
}

function decodeVp1(fields, raw) {
  if (fields[3] === "V") return null;
  const lat = parseCoordinate(fields[4], fields[5], false);
  const lng = parseCoordinate(fields[6], fields[7], true);
  if (lat === null || lng === null) return null;
  return {
    protocol: "h02",
    timestamp: parseDateTime(fields[10], null) || new Date(),
    latitude: lat,
    longitude: lng,
    speedKmh: toNumber(fields[8], 0),
    course: toNumber(fields[9], 0),
    satellites: null,
    ignition: null,
    gpsValid: fields[3] === "A",
    io: { type: "VP1", sentence: raw.fields.join(",") },
  };
}

function parseCoordinate(value, hemisphere, isLongitude) {
  if (!value || !hemisphere) return null;
  const clean = String(value).replace(/^-/, "");
  const dot = clean.indexOf(".");
  if (dot < 0) return null;

  const split = Math.max(1, dot - 2);
  const degreesText = clean.slice(0, split);
  const minutesText = clean.slice(split);
  const degrees = Number.parseInt(degreesText, 10);
  const minutes = Number.parseFloat(minutesText);
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes)) return null;

  let coordinate = degrees + minutes / 60;
  if (hemisphere === "S" || hemisphere === "W" || String(value).startsWith("-")) {
    coordinate *= -1;
  }
  return coordinate;
}

function parseDateTime(dateText, timeText) {
  if (!/^\d{6}$/.test(dateText || "")) return null;
  const day = Number.parseInt(dateText.slice(0, 2), 10);
  const month = Number.parseInt(dateText.slice(2, 4), 10) - 1;
  const year = 2000 + Number.parseInt(dateText.slice(4, 6), 10);
  const time = /^\d{6}$/.test(timeText || "") ? timeText : "000000";
  const hour = Number.parseInt(time.slice(0, 2), 10);
  const minute = Number.parseInt(time.slice(2, 4), 10);
  const second = Number.parseInt(time.slice(4, 6), 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function alarmFromStatus(status) {
  if ((status & 1) === 0) return "vibration";
  if ((status & (1 << 1)) === 0 || (status & (1 << 18)) === 0) return "sos";
  if ((status & (1 << 2)) === 0) return "overspeed";
  if ((status & (1 << 19)) === 0) return "powerCut";
  return null;
}

function encodeH02Ack(imei, type) {
  if (!imei || !type) return null;
  if (type === "V0" || type === "HTBT") return Buffer.from(`*HQ,${imei},${type}#`, "ascii");
  if (type === "NBR") return Buffer.from(`*HQ,${imei},V4,NBR,${formatUtcDateTime()}#`, "ascii");
  return null;
}

function formatUtcDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  looksLikeH02Packet,
  decodeH02Packet,
  encodeH02Ack,
};
