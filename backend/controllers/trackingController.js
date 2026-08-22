const {
  getLatestPositionForVehicle,
  getPositionsForVehicle,
} = require("../services/trackingService");

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.getLatestPosition = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!uuidRegex.test(vehicleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid vehicleId is required" });
    }

    const latest = await getLatestPositionForVehicle(vehicleId, req.user);
    if (!latest) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Vehicle not found or not accessible",
        });
    }

    res.json({
      success: true,
      vehicle: latest.vehicle,
      position: latest.position,
      message: latest.position
        ? "Latest position found"
        : "No tracking data received yet",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTodayPositions = async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId || req.params.id;
    if (!uuidRegex.test(vehicleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid vehicleId is required" });
    }

    const result = await getPositionsForVehicle(vehicleId, req.user, {
      today: true,
    });
    if (!result) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Vehicle not found or not accessible",
        });
    }

    res.json({
      success: true,
      vehicle: result.vehicle,
      positions: result.positions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPositions = async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId || req.params.id;
    if (!uuidRegex.test(vehicleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid vehicleId is required" });
    }

    const result = await getPositionsForVehicle(vehicleId, req.user, {
      from: req.query.from,
      limit: req.query.limit,
    });
    if (!result) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Vehicle not found or not accessible",
        });
    }

    res.json({
      success: true,
      vehicle: result.vehicle,
      positions: result.positions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
