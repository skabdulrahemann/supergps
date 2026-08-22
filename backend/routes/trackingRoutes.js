const express = require("express");
const router = express.Router();
const {
  getLatestPosition,
  getPositions,
  getTodayPositions,
} = require("../controllers/trackingController");
const { protect } = require("../middleware/auth");

router.get("/:vehicleId/latest", protect, getLatestPosition);
router.get("/:vehicleId/positions/today", protect, getTodayPositions);
router.get("/:vehicleId/positions", protect, getPositions);

module.exports = router;
