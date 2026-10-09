const express = require("express");

const {
  getCategories,
  createCategory,
} = require("../controllers/categoryController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Get all categories
router.get("/", authenticateToken, getCategories);

// Create a category
router.post("/", authenticateToken, createCategory);

module.exports = router;
