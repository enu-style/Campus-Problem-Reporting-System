const express = require("express");

const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// ADMIN USER MANAGEMENT
// ======================================================

router.get("/", authenticateToken, requireRole("ADMINISTRATOR"), getUsers);

router.post("/", authenticateToken, requireRole("ADMINISTRATOR"), createUser);

router.patch(
  "/:id",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  updateUser,
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  deleteUser,
);

module.exports = router;
