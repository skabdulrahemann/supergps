const express = require("express");
const router = express.Router();
const {
  getLatestPosition,
  getPositions,
  getGatewayStatus,
  getTodayPositions,
} = require("../controllers/trackingController");
const { protect, authorize } = require("../middleware/auth");

router.get("/debug/status", protect, authorize("admin"), getGatewayStatus);
router.get("/:vehicleId/latest", protect, getLatestPosition);
router.get("/:vehicleId/positions/today", protect, getTodayPositions);
router.get("/:vehicleId/positions", protect, getPositions);

module.exports = router;
