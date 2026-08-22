const assert = require("assert");

const {
  buildMatchUrl,
  matchRecordsToRoad,
} = require("../services/osrmMapMatcher");

async function testUrlGeneration() {
  const url = buildMatchUrl(
    [
      {
        latitude: 19.138,
        longitude: 77.321,
        timestamp: new Date("2026-08-22T05:30:00.000Z"),
      },
      {
        latitude: 19.139,
        longitude: 77.322,
        timestamp: new Date("2026-08-22T05:30:10.000Z"),
      },
    ],
    {
      baseUrl: "http://127.0.0.1:5000/",
      profile: "driving",
      radiusMeters: 40,
    },
  );

  assert.strictEqual(
    url.toString(),
    "http://127.0.0.1:5000/match/v1/driving/77.321,19.138;77.322,19.139?overview=false&geometries=geojson&radiuses=40%3B40&timestamps=1787376600%3B1787376610",
  );
  console.log("PASS OSRM match URL generation");
}

async function testRecordSnapping() {
  const records = [
    {
      latitude: 19.1383,
      longitude: 77.321,
      speedKmh: 42,
      timestamp: new Date("2026-08-22T05:30:00.000Z"),
    },
    {
      latitude: 19.1386,
      longitude: 77.3214,
      speedKmh: 44,
      timestamp: new Date("2026-08-22T05:30:10.000Z"),
    },
  ];
  const vehicle = {
    lastLatitude: 19.138,
    lastLongitude: 77.3208,
    lastSeenAt: new Date("2026-08-22T05:29:50.000Z"),
  };
  const calls = [];
  const matched = await matchRecordsToRoad(records, vehicle, {
    enabled: true,
    baseUrl: "http://osrm.test",
    fetchImpl: async (url) => {
      calls.push(url.toString());
      return {
        ok: true,
        async json() {
          return {
            code: "Ok",
            tracepoints: [
              { location: [77.3208, 19.138], name: "Previous" },
              { location: [77.32104, 19.13833], name: "Main Road" },
              { location: [77.32143, 19.13863], name: "Main Road" },
            ],
            matchings: [{ confidence: 0.94 }],
          };
        },
      };
    },
  });

  assert.strictEqual(calls.length, 1);
  assert.ok(Math.abs(matched[0].latitude - 19.13833) < 0.0000001);
  assert.ok(Math.abs(matched[0].longitude - 77.32104) < 0.0000001);
  assert.strictEqual(matched[0].mapMatching.provider, "osrm");
  assert.strictEqual(matched[0].mapMatching.snapped, true);
  assert.strictEqual(matched[0].mapMatching.originalLatitude, 19.1383);
  assert.strictEqual(matched[0].mapMatching.confidence, 0.94);
  assert.strictEqual(matched[1].mapMatching.name, "Main Road");
  console.log("PASS OSRM snapped records preserve original coordinate metadata");
}

async function testDisabledAndFailureFallback() {
  const records = [{ latitude: 19.1383, longitude: 77.321 }];
  const disabled = await matchRecordsToRoad(records, null, { enabled: false });
  assert.strictEqual(disabled[0], records[0]);

  const failed = await matchRecordsToRoad(
    [
      {
        latitude: 19.1383,
        longitude: 77.321,
        timestamp: new Date("2026-08-22T05:30:00.000Z"),
      },
    ],
    {
      lastLatitude: 19.138,
      lastLongitude: 77.3208,
      lastSeenAt: new Date("2026-08-22T05:29:50.000Z"),
    },
    {
      enabled: true,
      baseUrl: "http://osrm.test",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    },
  );
  assert.strictEqual(failed[0].latitude, records[0].latitude);
  assert.strictEqual(failed[0].mapMatching.snapped, false);
  assert.match(failed[0].mapMatching.error, /network down/);
  console.log("PASS OSRM disabled and failure fallback");
}

async function run() {
  await testUrlGeneration();
  await testRecordSnapping();
  await testDisabledAndFailureFallback();
  console.log("\nALL OSRM MAP MATCHER TESTS PASSED");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
