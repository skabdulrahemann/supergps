const { Op } = require("sequelize");
const { Vehicle, Position, Dealer } = require("../models");
const { emitTrackingPosition } = require("../tracking/trackingEvents");
const { matchRecordsToRoad } = require("./osrmMapMatcher");

function sanitizeRawValue(value) {
  if (Buffer.isBuffer(value)) return value.toString("hex");
  if (Array.isArray(value)) return value.map(sanitizeRawValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        sanitizeRawValue(childValue),
      ]),
    );
  }
  return value;
}

function serializePosition(position) {
  if (!position) return null;

  return {
    id: position.id,
    vehicleId: position.vehicleId,
    imeiNumber: position.imeiNumber,
    latitude: position.latitude,
    longitude: position.longitude,
    altitude: position.altitude,
    speedKmh: position.speedKmh,
    course: position.course,
    satellites: position.satellites,
    ignition: position.ignition,
    deviceTimestamp: position.deviceTimestamp,
    receivedAt: position.createdAt,
  };
}

function serializeVehicleSnapshot(vehicle) {
  return {
    id: vehicle.id,
    vehicleNumber: vehicle.vehicleNumber,
    imeiNumber: vehicle.imeiNumber,
    deviceSerialNumber: vehicle.deviceSerialNumber,
    activationStatus: vehicle.activationStatus,
    isActive: vehicle.isActive,
    lastLatitude: vehicle.lastLatitude,
    lastLongitude: vehicle.lastLongitude,
    lastSpeedKmh: vehicle.lastSpeedKmh,
    lastCourse: vehicle.lastCourse,
    lastIgnition: vehicle.lastIgnition,
    lastSatellites: vehicle.lastSatellites,
    lastSeenAt: vehicle.lastSeenAt,
  };
}

function buildSnapshotPosition(vehicle) {
  if (
    vehicle.lastLatitude === null ||
    vehicle.lastLongitude === null ||
    !vehicle.lastSeenAt
  ) {
    return null;
  }

  return {
    id: null,
    vehicleId: vehicle.id,
    imeiNumber: vehicle.imeiNumber,
    latitude: vehicle.lastLatitude,
    longitude: vehicle.lastLongitude,
    altitude: null,
    speedKmh: vehicle.lastSpeedKmh,
    course: vehicle.lastCourse,
    satellites: vehicle.lastSatellites,
    ignition: vehicle.lastIgnition,
    deviceTimestamp: vehicle.lastSeenAt,
    receivedAt: vehicle.updatedAt,
  };
}

function getKolkataDayBounds(date = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(date.getTime() + istOffsetMs);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - istOffsetMs);
  const end = new Date(
    Date.UTC(year, month, day, 23, 59, 59, 999) - istOffsetMs,
  );
  return { start, end };
}

function isValidGpsRecord(record) {
  return (
    Number.isFinite(record.latitude) &&
    Number.isFinite(record.longitude) &&
    record.latitude >= -90 &&
    record.latitude <= 90 &&
    record.longitude >= -180 &&
    record.longitude <= 180
  );
}

async function findActiveVehicleByImei(imeiNumber) {
  return Vehicle.findOne({ where: { imeiNumber, isActive: true } });
}

async function isImeiAuthorized(imeiNumber) {
  const vehicle = await findActiveVehicleByImei(imeiNumber);
  return Boolean(vehicle);
}

async function savePositionsForImei(imeiNumber, records) {
  const vehicle = await findActiveVehicleByImei(imeiNumber);
  if (!vehicle) {
    throw new Error(`Unknown or inactive IMEI: ${imeiNumber}`);
  }

  const validRecords = records.filter(isValidGpsRecord);
  if (validRecords.length === 0) {
    return { vehicle, positions: [] };
  }
  const matchedRecords = await matchRecordsToRoad(validRecords, vehicle);

  const positionRows = matchedRecords.map((record) => ({
    vehicleId: vehicle.id,
    imeiNumber,
    latitude: record.latitude,
    longitude: record.longitude,
    altitude: record.altitude ?? null,
    speedKmh: record.speedKmh ?? null,
    course: record.course ?? null,
    satellites: record.satellites ?? null,
    ignition: record.ignition ?? null,
    deviceTimestamp: record.timestamp || new Date(),
    raw: sanitizeRawValue({
      protocol: record.protocol,
      protocolCodec: record.codecId,
      priority: record.priority,
      eventIoId: record.eventIoId,
      generationType: record.generationType,
      movement: record.movement,
      mapMatching: record.mapMatching || null,
      io: record.io || {},
    }),
  }));

  const positions = await Position.bulkCreate(positionRows, {
    returning: true,
  });
  const latestRecord = matchedRecords.reduce((latest, record) => {
    const latestTime = latest.timestamp ? latest.timestamp.getTime() : 0;
    const recordTime = record.timestamp ? record.timestamp.getTime() : 0;
    return recordTime >= latestTime ? record : latest;
  }, matchedRecords[0]);

  vehicle.lastLatitude = latestRecord.latitude;
  vehicle.lastLongitude = latestRecord.longitude;
  vehicle.lastSpeedKmh = latestRecord.speedKmh ?? null;
  vehicle.lastCourse = latestRecord.course ?? null;
  vehicle.lastIgnition = latestRecord.ignition ?? null;
  vehicle.lastSatellites = latestRecord.satellites ?? null;
  vehicle.lastSeenAt = latestRecord.timestamp || new Date();
  await vehicle.save();

  const vehicleSnapshot = serializeVehicleSnapshot(vehicle);
  positions.forEach((position) => {
    emitTrackingPosition({
      vehicleId: vehicle.id,
      vehicle: vehicleSnapshot,
      position: serializePosition(position),
    });
  });

  return { vehicle, positions };
}

async function canUserAccessVehicle(user, vehicle) {
  if (!user || !vehicle) return false;
  if (user.role === "admin") return true;
  if (user.role === "customer") return vehicle.customerId === user.id;
  if (user.role === "technician") return vehicle.activatedBy === user.id;

  if (user.role === "dealer") {
    const dealer = await Dealer.findOne({ where: { userId: user.id } });
    return Boolean(dealer && vehicle.dealerId === dealer.id);
  }

  return false;
}

async function getLatestPositionForVehicle(vehicleId, user) {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) return null;

  const hasAccess = await canUserAccessVehicle(user, vehicle);
  if (!hasAccess) return null;

  const position = await Position.findOne({
    where: { vehicleId },
    order: [
      ["deviceTimestamp", "DESC"],
      ["createdAt", "DESC"],
    ],
  });

  return {
    vehicle: serializeVehicleSnapshot(vehicle),
    position: serializePosition(position) || buildSnapshotPosition(vehicle),
  };
}

async function getPositionsForVehicle(vehicleId, user, options = {}) {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) return null;

  const hasAccess = await canUserAccessVehicle(user, vehicle);
  if (!hasAccess) return null;

  const where = { vehicleId };
  if (options.today) {
    const { start, end } = getKolkataDayBounds();
    where.deviceTimestamp = { [Op.between]: [start, end] };
  } else if (options.from) {
    const from = new Date(options.from);
    if (!Number.isNaN(from.getTime())) {
      where.deviceTimestamp = { [Op.gt]: from };
    }
  }

  const positions = await Position.findAll({
    where,
    order: [
      ["deviceTimestamp", "ASC"],
      ["createdAt", "ASC"],
    ],
    limit: Number(options.limit || 10000),
  });

  return {
    vehicle: serializeVehicleSnapshot(vehicle),
    positions: positions.map(serializePosition),
  };
}

module.exports = {
  isImeiAuthorized,
  savePositionsForImei,
  canUserAccessVehicle,
  getLatestPositionForVehicle,
  getPositionsForVehicle,
  serializePosition,
  serializeVehicleSnapshot,
};
