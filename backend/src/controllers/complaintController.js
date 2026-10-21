const prisma = require("../config/prisma");
const fs = require("fs");
const path = require("path");
const { sendComplaintStatusNotification } = require("../utils/email");
const {
  notifyComplaintParticipants,
} = require("./notificationController");
// ======================================================
// CHECK WHO CAN VIEW A COMPLAINT
// ======================================================
const canViewComplaint = async (userId, complaint) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { role: true },
  });

  if (!user) {
    return false;
  }

  const roleName = user.role?.name;

  if (roleName === "STUDENT") {
    return complaint.reportedById === user.id;
  }

  if (roleName === "DEPARTMENT_OFFICER") {
    return (
      user.departmentId != null && complaint.departmentId === user.departmentId
    );
  }

  return ["STAFF", "ADMINISTRATOR"].includes(roleName);
};
// ======================================================
// VALID VALUES
// ======================================================
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const VALID_STATUSES = [
  "PENDING",
  "REVIEWED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

// ======================================================
// STATUS TRANSITION RULES
// ======================================================
// Defines which status can follow another status.
//
// Normal workflow:
// PENDING → REVIEWED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
//
// REJECTED can be used when a complaint is invalid or not accepted.
const ALLOWED_TRANSITIONS = {
  PENDING: ["REVIEWED", "ASSIGNED", "REJECTED"],
  REVIEWED: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

// ======================================================
// CREATE COMPLAINT
// Supports registered and custom campus locations
// ======================================================
const createComplaint = async (req, res) => {
  let keepUploadedFiles = false;

  try {
    const {
      title,
      description,
      priority,
      categoryId,
      locationId,
      locationDescription,
      latitude,
      longitude,
    } = req.body;

    // 1. Validate required text fields
    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      !title.trim() ||
      !description.trim() ||
      categoryId === undefined ||
      categoryId === null ||
      String(categoryId).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and categoryId are required",
      });
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const categoryIdNumber = Number(categoryId);

    if (!Number.isInteger(categoryIdNumber) || categoryIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // 2. Validate custom location description
    if (
      locationDescription !== undefined &&
      locationDescription !== null &&
      typeof locationDescription !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Location description must be text",
      });
    }

    const cleanLocationDescription =
      typeof locationDescription === "string" ? locationDescription.trim() : "";

    if (cleanLocationDescription.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Location description cannot exceed 500 characters",
      });
    }

    // 3. Determine the location choice
    const hasLocationId =
      locationId !== undefined &&
      locationId !== null &&
      String(locationId).trim() !== "";

    const hasCustomLocation = cleanLocationDescription.length > 0;

    // Map coordinates are also a valid location choice
    const hasCoordinates =
      (latitude !== undefined && latitude !== null && latitude !== "") ||
      (longitude !== undefined && longitude !== null && longitude !== "");

    // At least one location choice is required
    if (!hasLocationId && !hasCustomLocation && !hasCoordinates) {
      return res.status(400).json({
        success: false,
        message:
          "Select a registered location, provide a custom location description, or pick a point on the map",
      });
    }

    let locationIdNumber = null;

    if (hasLocationId) {
      locationIdNumber = Number(locationId);

      if (!Number.isInteger(locationIdNumber) || locationIdNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
      }
    }

    // 4. Validate priority
    const complaintPriority = priority || "MEDIUM";

    if (!VALID_PRIORITIES.includes(complaintPriority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority",
      });
    }

    // 5. Verify category exists
    const category = await prisma.category.findUnique({
      where: {
        id: categoryIdNumber,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 6. Verify registered location, if selected
    if (hasLocationId) {
      const location = await prisma.location.findUnique({
        where: {
          id: locationIdNumber,
        },
      });

      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }
    }

    // 7. Validate latitude and longitude (map coordinates)
    let latitudeNumber = null;
    let longitudeNumber = null;

    if (hasCoordinates) {
      if (latitude === undefined || latitude === null || latitude === "") {
        return res.status(400).json({
          success: false,
          message: "Latitude is required when coordinates are provided",
        });
      }

      if (longitude === undefined || longitude === null || longitude === "") {
        return res.status(400).json({
          success: false,
          message: "Longitude is required when coordinates are provided",
        });
      }

      latitudeNumber = Number(latitude);
      if (!Number.isFinite(latitudeNumber) || latitudeNumber < -90 || latitudeNumber > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be a valid number between -90 and 90",
        });
      }

      longitudeNumber = Number(longitude);
      if (!Number.isFinite(longitudeNumber) || longitudeNumber < -180 || longitudeNumber > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be a valid number between -180 and 180",
        });
      }
    }

    // 8. Create complaint and initial history transactionally
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          title: cleanTitle,
          description: cleanDescription,
          priority: complaintPriority,
          reportedById: Number(req.user.userId),
          categoryId: categoryIdNumber,

          // Registered location OR custom location
          locationId: hasLocationId ? locationIdNumber : null,
          locationDescription: hasCustomLocation
            ? cleanLocationDescription
            : null,

          // Map coordinates (optional)
          latitude: latitudeNumber,
          longitude: longitudeNumber,
        },

        include: {
          category: true,
          location: true,
          department: true,

          reporter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
      // Save attachment metadata in the same transaction
      if (req.files && req.files.length > 0) {
        await tx.complaintAttachment.createMany({
          data: req.files.map((file) => ({
            complaintId: complaint.id,
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
          })),
        });
      }
      // Record initial complaint status
      await tx.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          oldStatus: null,
          newStatus: complaint.status,
          changedById: Number(req.user.userId),
          note: "Complaint created",
        },
      });

      return complaint;
    });

    keepUploadedFiles = true;

    return res.status(201).json({
      success: true,
      message: "Complaint reported successfully",
      complaint: result,
    });
  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating complaint",
    });
  } finally {
    if (!keepUploadedFiles && req.files?.length) {
      await Promise.all(
        req.files.map((file) => fs.promises.unlink(file.path).catch(() => {})),
      );
    }
  }
};

// ======================================================
// GET ALL COMPLAINTS
// ======================================================
const getComplaints = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.user.userId) },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const roleName = user.role?.name;
    const where = {};

    if (roleName === "STUDENT") {
      where.reportedById = user.id;
    } else if (roleName === "DEPARTMENT_OFFICER") {
      if (user.departmentId == null) {
        return res.status(403).json({
          success: false,
          message: "No department is assigned to this officer",
        });
      }
      where.departmentId = user.departmentId;
    } else if (!["STAFF", "ADMINISTRATOR"].includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view complaints",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number(req.query.pageSize) || 20),
    );

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          category: true,
          location: true,
          department: true,
          reporter: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      prisma.complaint.count({ where }),
    ]);

    return res.json({
      success: true,
      complaints,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("Get complaints error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching complaints",
    });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: {
        reportedById: req.user.userId,
      },

      include: {
        category: true,
        location: true,
        department: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching your complaints",
    });
  }
};

// ======================================================
// GET COMPLAINT BY ID
// ======================================================
const getComplaintById = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },

      include: {
        category: true,
        location: true,
        department: true,

        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },

        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },

          include: {
            changedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
                roleId: true,
              },
            },
          },
        },

        attachments: true,
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    const allowed = await canViewComplaint(req.user.userId, complaint);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this complaint",
      });
    }

    return res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    console.error("Get complaint by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching complaint",
    });
  }
};

// ======================================================
// GET COMPLAINT STATUS HISTORY
// ======================================================
const getComplaintStatusHistory = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    // Check complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },

      select: { id: true, reportedById: true, departmentId: true },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    const allowed = await canViewComplaint(req.user.userId, complaint);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this complaint history",
      });
    }

    const history = await prisma.complaintStatusHistory.findMany({
      where: {
        complaintId,
      },

      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roleId: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Get complaint status history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching complaint status history",
    });
  }
};

// ======================================================
// UPDATE COMPLAINT STATUS
// ======================================================
const updateComplaintStatus = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const { status, note } = req.body;

    // --------------------------------------------------
    // Validate complaint ID
    // --------------------------------------------------
    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    // --------------------------------------------------
    // Validate status
    // --------------------------------------------------
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // --------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },

      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------
    // Get complaint
    // --------------------------------------------------
    const existingComplaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

    if (!existingComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // --------------------------------------------------
    // Prevent duplicate status
    // --------------------------------------------------
    if (existingComplaint.status === status) {
      return res.status(400).json({
        success: false,
        message: `Complaint is already ${status}`,
      });
    }

    // ==================================================
    // ROLE-BASED PERMISSION RULES
    // ==================================================
    // (STUDENT is blocked by the route-level requireRole
    // middleware and can never reach this controller.)

    const roleName = user.role.name;

    // --------------------------------------------------
    // DEPARTMENT OFFICERS
    // --------------------------------------------------
    if (roleName === "DEPARTMENT_OFFICER") {
      // Officer must belong to a department
      if (!user.departmentId) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to a department",
        });
      }

      // Complaint must belong to officer's department
      if (existingComplaint.departmentId !== user.departmentId) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to manage complaints from another department",
        });
      }

      // Officers can work on complaints and resolve them,
      // but they cannot close them.
      const allowedOfficerStatuses = ["IN_PROGRESS", "RESOLVED", "REJECTED"];

      if (!allowedOfficerStatuses.includes(status)) {
        return res.status(403).json({
          success: false,
          message:
            "Department officers can only move complaints to IN_PROGRESS, RESOLVED, or REJECTED",
        });
      }
    }

    // --------------------------------------------------
    // STAFF
    // --------------------------------------------------
    if (roleName === "STAFF") {
      const allowedStaffStatuses = [
        "REVIEWED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ];

      if (!allowedStaffStatuses.includes(status)) {
        return res.status(403).json({
          success: false,
          message: "Staff cannot set this complaint status",
        });
      }
    }

    // --------------------------------------------------
    // ADMINISTRATOR
    // --------------------------------------------------
    if (roleName === "ADMINISTRATOR") {
      // Administrators can manage the complete workflow.
    }

    // Unknown role protection
    const validRoles = [
      "STUDENT",
      "STAFF",
      "DEPARTMENT_OFFICER",
      "ADMINISTRATOR",
    ];

    if (!validRoles.includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: "Your role is not authorized to update complaint status",
      });
    }

    // ==================================================
    // VALIDATE STATUS TRANSITION
    // ==================================================
    const currentStatus = existingComplaint.status;

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: ${currentStatus} → ${status}`,
      });
    }

    // --------------------------------------------------
    // ASSIGNED requires a department. Without one the
    // complaint would be invisible to every officer.
    // --------------------------------------------------
    if (status === "ASSIGNED" && !existingComplaint.departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "A department must be assigned before the status can be set to ASSIGNED",
      });
    }

    // --------------------------------------------------
    // REJECTED requires a reason
    // --------------------------------------------------
    const cleanNoteRaw =
      typeof note === "string" && note.trim() ? note.trim() : null;

    if (status === "REJECTED" && !cleanNoteRaw) {
      return res.status(400).json({
        success: false,
        message: "A reason (note) is required when rejecting a complaint",
      });
    }

    const cleanNote = cleanNoteRaw;

    // ==================================================
    // UPDATE + HISTORY ATOMICALLY
    // The updateMany with the current status in the where
    // clause prevents a race condition: if another user
    // changed the status first, this update matches zero
    // rows and the transition is safely rejected.
    // ==================================================
    const raced = await prisma.complaint.updateMany({
      where: {
        id: complaintId,
        status: currentStatus,
      },

      data: {
        status,
      },
    });

    if (raced.count !== 1) {
      return res.status(409).json({
        success: false,
        message:
          "This complaint was just updated by someone else. Refresh and try again.",
      });
    }

    const complaint = await prisma.complaint.update({
      where: {
        id: complaintId,
      },

      data: {
        status,
      },

      include: {
        category: true,
        location: true,
        department: true,

        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Create status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId,
        oldStatus: currentStatus,
        newStatus: status,
        changedById: req.user.userId,
        note: cleanNote,
      },
    });

    const result = complaint;

    // Real notification for the reporter and other participants
    await notifyComplaintParticipants({
      complaintId,
      actorId: req.user.userId,
      type: "STATUS_CHANGED",
      message: `Complaint #${complaintId} ("${complaint.title}") moved to ${status} by ${user.fullName || "staff"}.`,
    });

    // --------------------------------------------------
    // Send email notification to the student (non-blocking:
    // a slow mail server must not delay the API response)
    // --------------------------------------------------
    const changedByName = user.fullName || "A staff member";
    const reporter = result.reporter;

    if (reporter && reporter.email) {
      sendComplaintStatusNotification(
        reporter.email,
        reporter.fullName,
        {
          id: result.id,
          title: result.title,
          status: result.status,
        },
        changedByName,
        cleanNote || null,
      ).catch((emailError) => {
        // Email failures should not fail the status update
        console.error(
          "Failed to send status notification email:",
          emailError.message,
        );
      });
    }

    return res.json({
      success: true,
      message: "Complaint status updated successfully",
      complaint: result,
    });
  } catch (error) {
    console.error("Update complaint status error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating complaint status",
    });
  }
};

// ======================================================
// ASSIGN COMPLAINT TO DEPARTMENT
// ======================================================
const assignComplaint = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const departmentIdNumber = Number(req.body.departmentId);

    // --------------------------------------------------
    // Validate complaint ID
    // --------------------------------------------------
    if (!Number.isInteger(complaintId) || complaintId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    // --------------------------------------------------
    // Validate department ID
    // --------------------------------------------------
    if (!Number.isInteger(departmentIdNumber) || departmentIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid department ID is required",
      });
    }

    // --------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },

      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------
    // Only STAFF and ADMINISTRATOR can assign
    // --------------------------------------------------
    if (!["STAFF", "ADMINISTRATOR"].includes(user.role.name)) {
      return res.status(403).json({
        success: false,
        message:
          "Only staff or administrator can assign complaints to departments",
      });
    }

    // --------------------------------------------------
    // Check department
    // --------------------------------------------------
    const department = await prisma.department.findUnique({
      where: {
        id: departmentIdNumber,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // --------------------------------------------------
    // Check complaint
    // --------------------------------------------------
    const existingComplaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

    if (!existingComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // --------------------------------------------------
    // Only complaints waiting for review, under review,
    // or already assigned can be (re)assigned. Once an
    // officer has started work (IN_PROGRESS, RESOLVED)
    // reassignment would silently reset the workflow.
    // --------------------------------------------------
    if (
      !["PENDING", "REVIEWED", "ASSIGNED"].includes(existingComplaint.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `A complaint with status ${existingComplaint.status} cannot be assigned. Only PENDING, REVIEWED, or ASSIGNED complaints can be assigned.`,
      });
    }

    // --------------------------------------------------
    // Prevent unnecessary assignment
    // --------------------------------------------------
    if (
      existingComplaint.departmentId === departmentIdNumber &&
      existingComplaint.status === "ASSIGNED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Complaint is already assigned to this department",
      });
    }

    // --------------------------------------------------
    // Do not assign a closed/rejected complaint
    // --------------------------------------------------
    if (["CLOSED", "REJECTED"].includes(existingComplaint.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign a ${existingComplaint.status.toLowerCase()} complaint`,
      });
    }

    // ==================================================
    // UPDATE + HISTORY ATOMICALLY
    // ==================================================
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          departmentId: departmentIdNumber,
          status: "ASSIGNED",
        },

        include: {
          category: true,
          location: true,
          department: true,

          reporter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // ------------------------------------------------
      // Create history
      // ------------------------------------------------
      if (existingComplaint.status !== "ASSIGNED") {
        await tx.complaintStatusHistory.create({
          data: {
            complaintId,
            oldStatus: existingComplaint.status,
            newStatus: "ASSIGNED",
            changedById: req.user.userId,
            note: `Complaint assigned to ${department.name}`,
          },
        });
      } else {
        // Department changed while status was already ASSIGNED
        await tx.complaintStatusHistory.create({
          data: {
            complaintId,
            oldStatus: "ASSIGNED",
            newStatus: "ASSIGNED",
            changedById: req.user.userId,
            note: `Complaint reassigned to ${department.name}`,
          },
        });
      }

      return complaint;
    });

    // --------------------------------------------------
    // Send email notification to the student (non-blocking)
    // --------------------------------------------------
    const changedByName = user.fullName || "A staff member";
    const reporter = result.reporter;

    // Real notification: the complaint now belongs to a department
    await notifyComplaintParticipants({
      complaintId,
      actorId: req.user.userId,
      type: "COMPLAINT_ASSIGNED",
      message: `Complaint #${complaintId} ("${existingComplaint.title}") was assigned to ${department.name}.`,
    });

    if (reporter && reporter.email) {
      sendComplaintStatusNotification(
        reporter.email,
        reporter.fullName,
        {
          id: result.id,
          title: result.title,
          status: result.status,
        },
        changedByName,
        `Complaint assigned to ${department.name}`,
      ).catch((emailError) => {
        console.error(
          "Failed to send assignment notification email:",
          emailError.message,
        );
      });
    }

    return res.json({
      success: true,
      message: "Complaint assigned successfully",
      complaint: result,
    });
  } catch (error) {
    console.error("Assign complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while assigning complaint",
    });
  }
};

const downloadComplaintAttachment = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (
      !Number.isInteger(complaintId) ||
      complaintId <= 0 ||
      !Number.isInteger(attachmentId) ||
      attachmentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint or attachment ID",
      });
    }

    const attachment = await prisma.complaintAttachment.findFirst({
      where: {
        id: attachmentId,
        complaintId,
      },
      include: {
        complaint: true,
      },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const allowed = await canViewComplaint(
      req.user.userId,
      attachment.complaint,
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to download this attachment",
      });
    }

    // Resolve the stored filename safely inside the upload directory.
    const uploadDirectory = path.resolve(__dirname, "../../uploads/complaints");
    const filePath = path.resolve(
      uploadDirectory,
      path.basename(attachment.storedName),
    );

    if (!filePath.startsWith(uploadDirectory + path.sep)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attachment path",
      });
    }

    await fs.promises.access(filePath, fs.constants.R_OK);

    return res.download(filePath, path.basename(attachment.originalName));
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Attachment file is missing from storage",
      });
    }

    console.error("Download complaint attachment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while downloading attachment",
    });
  }
};

// ==================================================
// STUDENT CONFIRM / REOPEN
// Students confirm a resolved complaint as CLOSED, or
// reopen it if it was not actually fixed.
// ==================================================
const confirmComplaint = async (req, res) => {
  try {
    const complaintId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.reportedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only confirm your own complaints",
      });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Only resolved complaints can be confirmed as closed",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.complaint.update({
        where: { id: complaintId },
        data: { status: "CLOSED" },
      });

      await tx.complaintStatusHistory.create({
        data: {
          complaintId,
          oldStatus: "RESOLVED",
          newStatus: "CLOSED",
          changedById: req.user.userId,
          note: "Confirmed by student",
        },
      });

      return result;
    });

    // Notify staff that the student accepted the resolution.
    await notifyComplaintParticipants({
      complaintId,
      actorId: req.user.userId,
      type: "COMPLAINT_CONFIRMED",
      message: `Student confirmed complaint #${complaintId} as resolved.`,
    });

    return res.json({
      success: true,
      message: "Complaint confirmed and closed",
      complaint: updated,
    });
  } catch (error) {
    console.error("Confirm complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while confirming complaint",
    });
  }
};

// ==================================================
// REOPEN A COMPLAINT
// ==================================================
const reopenComplaint = async (req, res) => {
  try {
    const complaintId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const reopenReason =
      typeof req.body?.reopenReason === "string"
        ? req.body.reopenReason.trim()
        : "";

    if (reopenReason.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason of at least 10 characters",
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.reportedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only reopen your own complaints",
      });
    }

    const reopenableStatuses = ["RESOLVED", "CLOSED", "IN_PROGRESS"];

    if (!reopenableStatuses.includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Only resolved, closed or in-progress complaints can be reopened",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.complaint.update({
        where: { id: complaintId },
        data: { status: "REOPENED" },
      });

      await tx.complaintStatusHistory.create({
        data: {
          complaintId,
          oldStatus: complaint.status,
          newStatus: "REOPENED",
          changedById: req.user.userId,
          note: reopenReason,
        },
      });

      return result;
    });

    // Notify assigned staff that the complaint was reopened.
    await notifyComplaintParticipants({
      complaintId,
      actorId: req.user.userId,
      type: "COMPLAINT_REOPENED",
      message: `Complaint #${complaintId} was reopened by the student: ${reopenReason}`,
    });

    return res.json({
      success: true,
      message: "Complaint reopened",
      complaint: updated,
    });
  } catch (error) {
    console.error("Reopen complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while reopening complaint",
    });
  }
};

// ==================================================
// STATS FOR THE CURRENT USER
// ==================================================
const getComplaintStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const baseWhere =
      role === "STUDENT"
        ? { reportedById: userId }
        : role === "DEPARTMENT_OFFICER"
          ? { departmentId: req.user.departmentId ?? undefined }
          : {};

    const grouped = await prisma.complaint.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: baseWhere,
    });

    const counts = {};
    let total = 0;

    for (const group of grouped) {
      counts[group.status] = group._count._all;
      total += group._count._all;
    }

    return res.json({
      success: true,
      stats: {
        total,
        counts,
      },
    });
  } catch (error) {
    console.error("Get complaint stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading stats",
    });
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================
module.exports = {
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
  canViewComplaint,
};
