const express = require("express");

const {
  register,
  login,
  updateProfile,
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// AUTH ROUTES
// ======================================================

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Get currently authenticated user
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Authenticated user",
    user: req.user,
  });
});

// Update logged-in user's profile
router.patch("/profile", authenticateToken, updateProfile);

module.exports = router;
