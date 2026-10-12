const express = require("express");

const {
  getDepartments,
  createDepartment,
} = require("../controllers/departmentController");

const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// All authenticated users can view departments
router.get("/", authenticateToken, getDepartments);

// Only administrators can create departments
router.post(
  "/",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  createDepartment
);

module.exports = router;
