const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
  getComplaintComments,
  createComplaintComment,
} = require("../controllers/commentController");

const router = express.Router();

// Get all comments for a complaint
router.get("/:id/comments", authenticateToken, getComplaintComments);

// Add a comment
router.post("/:id/comments", authenticateToken, createComplaintComment);

module.exports = router;
