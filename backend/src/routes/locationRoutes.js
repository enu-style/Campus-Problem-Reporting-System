const express = require("express");

const {
  getLocations,
  createLocation,
} = require("../controllers/locationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Get all locations
router.get("/", authenticateToken, getLocations);

// Create a location
router.post("/", authenticateToken, createLocation);

module.exports = router;
