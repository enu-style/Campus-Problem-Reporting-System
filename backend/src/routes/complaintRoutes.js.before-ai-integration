const requireRole = require("../middleware/roleMiddleware");
const handleComplaintUpload = require("../middleware/complaintUpload");
const express = require("express");

const {
  createComplaint,
  getComplaints,
  getMyComplaints,
  getComplaintById,
  getComplaintStatusHistory,
  updateComplaintStatus,
  assignComplaint,
  downloadComplaintAttachment,
} = require("../controllers/complaintController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// CREATE A NEW COMPLAINT
// ======================================================
router.post("/", authenticateToken, handleComplaintUpload, createComplaint);

// ======================================================
// GET COMPLAINTS REPORTED BY LOGGED-IN USER
// ======================================================
router.get("/my", authenticateToken, getMyComplaints);

// ======================================================
// UPDATE COMPLAINT STATUS
// ======================================================
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("STAFF", "DEPARTMENT_OFFICER", "ADMINISTRATOR"),
  updateComplaintStatus,
);

// ======================================================
// ASSIGN COMPLAINT TO DEPARTMENT
// ======================================================
router.patch(
  "/:id/assign",
  authenticateToken,
  requireRole("STAFF", "ADMINISTRATOR"),
  assignComplaint,
);

// ======================================================
// GET COMPLAINT STATUS HISTORY
// ======================================================
router.get(
  "/:id/attachments/:attachmentId",
  authenticateToken,
  downloadComplaintAttachment,
);
router.get("/:id/history", authenticateToken, getComplaintStatusHistory);

// ======================================================
// GET ONE COMPLAINT BY ID
// ======================================================
router.get("/:id", authenticateToken, getComplaintById);

// ======================================================
// GET ALL COMPLAINTS
// ======================================================
router.get("/", authenticateToken, getComplaints);

module.exports = router;
