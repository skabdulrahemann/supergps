const express = require("express");
const router = express.Router();
const {
  getMyVehicles,
  getVehicleById,
  getDealerVehicles,
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");
const {
  getPositions,
  getTodayPositions,
} = require("../controllers/trackingController");
const { createVehicleRules } = require("../middleware/validation");
const { protect, authorize } = require("../middleware/auth");

router.get("/my-vehicles", protect, authorize("customer"), getMyVehicles);
router.get("/dealer-vehicles", protect, authorize("dealer"), getDealerVehicles);
router.get("/all", protect, authorize("admin"), getAllVehicles);
router.post(
  "/",
  protect,
  authorize("admin"),
  createVehicleRules,
  createVehicle,
);
router.get("/:id/positions/today", protect, getTodayPositions);
router.get("/:id/positions", protect, getPositions);
router.get("/:id", protect, getVehicleById);
router.put("/:id", protect, authorize("admin"), updateVehicle);
router.delete("/:id", protect, authorize("admin"), deleteVehicle);

module.exports = router;
