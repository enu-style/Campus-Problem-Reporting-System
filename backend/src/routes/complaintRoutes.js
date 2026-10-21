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
  confirmComplaint,
  reopenComplaint,
  getComplaintStats,
  downloadComplaintAttachment,
} = require("../controllers/complaintController");

const {
  getMyNotifications,
  markNotificationsRead,
} = require("../controllers/notificationController");

const authenticateToken = require("../middleware/authMiddleware");
const { getComplaintAssistance } = require("../controllers/aiController");

const router = express.Router();

// ======================================================
// CREATE A NEW COMPLAINT
// ======================================================
router.post("/", authenticateToken, handleComplaintUpload, createComplaint);

// Analyze a complaint without saving it
router.post("/ai-assistance", authenticateToken, getComplaintAssistance);

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
// STUDENT CONFIRM / REOPEN
// ======================================================
router.patch(
  "/:id/confirm",
  authenticateToken,
  requireRole("STUDENT"),
  confirmComplaint,
);

router.patch(
  "/:id/reopen",
  authenticateToken,
  requireRole("STUDENT"),
  reopenComplaint,
);

// ======================================================
// NOTIFICATIONS
// ======================================================
router.get("/notifications", authenticateToken, getMyNotifications);

router.post("/notifications/read", authenticateToken, markNotificationsRead);

// ======================================================
// STATS
// ======================================================
router.get("/stats", authenticateToken, getComplaintStats);

// ======================================================
// GET ONE COMPLAINT BY ID
// ======================================================
router.get("/:id", authenticateToken, getComplaintById);

// ======================================================
// GET ALL COMPLAINTS
// ======================================================
router.get("/", authenticateToken, getComplaints);

module.exports = router;
