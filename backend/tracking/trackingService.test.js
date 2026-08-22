const assert = require("assert");

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://test:test@localhost:5432/supergps_test";
process.env.DB_SSL = process.env.DB_SSL || "false";

const { Vehicle, Position } = require("../models");
const { savePositionsForImei } = require("../services/trackingService");
const { onTrackingPosition } = require("./trackingEvents");

async function run() {
  const originalFindOne = Vehicle.findOne;
  const originalBulkCreate = Position.bulkCreate;

  const savedRows = [];
  const emitted = [];
  const unsubscribe = onTrackingPosition((payload) => emitted.push(payload));

  const vehicle = {
    id: "11111111-1111-4111-8111-111111111111",
    vehicleNumber: "MH 12 AB 4589",
    imeiNumber: "864636050000001",
    deviceSerialNumber: "FMB920",
    activationStatus: "active",
    isActive: true,
    lastLatitude: null,
    lastLongitude: null,
    lastSpeedKmh: null,
    lastCourse: null,
    lastIgnition: null,
    lastSatellites: null,
    lastSeenAt: null,
    saveCount: 0,
    async save() {
      this.saveCount += 1;
    },
  };

  try {
    Vehicle.findOne = async ({ where }) =>
      where.imeiNumber === vehicle.imeiNumber && where.isActive ? vehicle : null;
    Position.bulkCreate = async (rows) => {
      savedRows.push(...rows);
      return rows.map((row, index) => ({
        id: `position-${index + 1}`,
        createdAt: new Date("2026-08-22T06:00:00.000Z"),
        ...row,
      }));
    };

    const result = await savePositionsForImei(vehicle.imeiNumber, [
      {
        codecId: 0x10,
        latitude: 19.1383,
        longitude: 77.321,
        altitude: 450,
        speedKmh: 42,
        course: 180,
        satellites: 9,
        ignition: true,
        movement: true,
        timestamp: new Date("2026-08-22T05:30:00.000Z"),
        eventIoId: 239,
        generationType: 2,
        priority: 1,
        io: {
          eventIoId: 239,
          totalIoCount: 3,
          externalVoltage: 12.5,
          elements: { 66: 12500, 239: 1, 999: "deadbeef" },
          elementMeta: {
            66: { size: 2, encoding: "uint" },
            239: { size: 1, encoding: "uint" },
            999: { size: 4, encoding: "hex" },
          },
        },
      },
    ]);

    assert.strictEqual(result.positions.length, 1);
    assert.strictEqual(savedRows.length, 1);
    assert.strictEqual(savedRows[0].imeiNumber, vehicle.imeiNumber);
    assert.strictEqual(savedRows[0].latitude, 19.1383);
    assert.strictEqual(savedRows[0].ignition, true);
    assert.strictEqual(savedRows[0].raw.protocolCodec, 0x10);
    assert.strictEqual(savedRows[0].raw.movement, true);
    assert.strictEqual(savedRows[0].raw.io.elements[999], "deadbeef");
    assert.strictEqual(vehicle.lastLatitude, 19.1383);
    assert.strictEqual(vehicle.lastSpeedKmh, 42);
    assert.strictEqual(vehicle.lastIgnition, true);
    assert.strictEqual(vehicle.saveCount, 1);

    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].vehicleId, vehicle.id);
    assert.strictEqual(emitted[0].vehicle.imeiNumber, vehicle.imeiNumber);
    assert.strictEqual(emitted[0].position.speedKmh, 42);
    console.log("PASS database save row and Socket.IO tracking event payload");
  } finally {
    unsubscribe();
    Vehicle.findOne = originalFindOne;
    Position.bulkCreate = originalBulkCreate;
  }

  console.log("\nALL TRACKING SERVICE TESTS PASSED");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
