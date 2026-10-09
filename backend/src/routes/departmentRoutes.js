const express = require("express");

const {
  getDepartments,
  createDepartment,
} = require("../controllers/departmentController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Get all departments
router.get("/", authenticateToken, getDepartments);

// Create a department
router.post("/", authenticateToken, createDepartment);

module.exports = router;
