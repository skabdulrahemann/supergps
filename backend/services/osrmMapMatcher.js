const DEFAULT_PROFILE = "driving";
const DEFAULT_RADIUS_METERS = 35;
const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_MAX_SNAP_METERS = 80;

function isEnabled() {
  return (
    process.env.OSRM_MAP_MATCHING_ENABLED === "true" &&
    Boolean(process.env.OSRM_BASE_URL)
  );
}

function validCoordinate(record) {
  return (
    Number.isFinite(record.latitude) &&
    Number.isFinite(record.longitude) &&
    record.latitude >= -90 &&
    record.latitude <= 90 &&
    record.longitude >= -180 &&
    record.longitude <= 180
  );
}

function toUnixSeconds(value) {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : Math.floor(time / 1000);
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildMatchUrl(trace, options = {}) {
  const baseUrl = (options.baseUrl || process.env.OSRM_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const profile =
    options.profile || process.env.OSRM_PROFILE || DEFAULT_PROFILE;
  const radius = Number(
    options.radiusMeters ||
      process.env.OSRM_MATCH_RADIUS_METERS ||
      DEFAULT_RADIUS_METERS,
  );
  const coordinates = trace
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");
  const url = new URL(`${baseUrl}/match/v1/${profile}/${coordinates}`);

  url.searchParams.set("overview", "false");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("radiuses", trace.map(() => radius).join(";"));

  const timestamps = trace.map((point) => toUnixSeconds(point.timestamp));
  const hasTimestamps =
    timestamps.every((time) => time !== null) &&
    timestamps.every((time, index) => index === 0 || time >= timestamps[index - 1]);
  if (hasTimestamps) {
    url.searchParams.set("timestamps", timestamps.join(";"));
  }

  return url;
}

async function fetchJson(url, options = {}) {
  const timeoutMs = Number(
    options.timeoutMs || process.env.OSRM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fetchImpl = options.fetchImpl || global.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error("fetch is not available in this Node.js runtime");
    }
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`OSRM responded with HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function pointFromRecord(record) {
  return {
    latitude: record.latitude,
    longitude: record.longitude,
    timestamp: record.timestamp,
  };
}

function pointFromVehicle(vehicle) {
  if (
    !vehicle ||
    !Number.isFinite(vehicle.lastLatitude) ||
    !Number.isFinite(vehicle.lastLongitude)
  ) {
    return null;
  }
  return {
    latitude: vehicle.lastLatitude,
    longitude: vehicle.lastLongitude,
    timestamp: vehicle.lastSeenAt,
  };
}

async function matchRecordsToRoad(records, vehicle, options = {}) {
  if (!(options.enabled ?? isEnabled())) return records;

  const validRecords = records.filter(validCoordinate);
  if (validRecords.length === 0) return records;

  const previousPoint = pointFromVehicle(vehicle);
  const trace = [
    ...(previousPoint ? [previousPoint] : []),
    ...validRecords.map(pointFromRecord),
  ];

  if (trace.length < 2) return records;

  try {
    const url = buildMatchUrl(trace, options);
    const data = await fetchJson(url, options);
    if (data.code !== "Ok" || !Array.isArray(data.tracepoints)) return records;

    const offset = previousPoint ? 1 : 0;
    const confidence = Array.isArray(data.matchings)
      ? data.matchings.reduce(
          (best, matching) => Math.max(best, Number(matching.confidence || 0)),
          0,
        )
      : null;
    const maxSnapMeters = Number(
      options.maxSnapMeters ||
        process.env.OSRM_MAX_SNAP_METERS ||
        DEFAULT_MAX_SNAP_METERS,
    );
    const mappedRecords = new Map();

    validRecords.forEach((record, index) => {
      const tracepoint = data.tracepoints[index + offset];
      if (!tracepoint || !Array.isArray(tracepoint.location)) return;

      const snapped = {
        latitude: Number(tracepoint.location[1]),
        longitude: Number(tracepoint.location[0]),
      };
      if (!validCoordinate(snapped)) return;

      const snapDistanceMeters = distanceMeters(record, snapped);
      if (snapDistanceMeters > maxSnapMeters) return;

      mappedRecords.set(record, {
        ...record,
        latitude: snapped.latitude,
        longitude: snapped.longitude,
        mapMatching: {
          provider: "osrm",
          snapped: true,
          originalLatitude: record.latitude,
          originalLongitude: record.longitude,
          snappedLatitude: snapped.latitude,
          snappedLongitude: snapped.longitude,
          snapDistanceMeters: Math.round(snapDistanceMeters * 10) / 10,
          confidence,
          name: tracepoint.name || null,
        },
      });
    });

    return records.map((record) => mappedRecords.get(record) || record);
  } catch (err) {
    return records.map((record) => ({
      ...record,
      mapMatching: {
        provider: "osrm",
        snapped: false,
        error: err.message,
      },
    }));
  }
}

module.exports = {
  matchRecordsToRoad,
  buildMatchUrl,
  distanceMeters,
};
