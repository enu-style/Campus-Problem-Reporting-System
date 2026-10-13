const prisma = require("../config/prisma");
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
      user.departmentId != null &&
      complaint.departmentId === user.departmentId
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
  try {
    const {
      title,
      description,
      priority,
      categoryId,
      locationId,
      locationDescription,
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
        message:
          "Title, description, and categoryId are required",
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
      typeof locationDescription === "string"
        ? locationDescription.trim()
        : "";

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

    const hasCustomLocation =
      cleanLocationDescription.length > 0;

    // Exactly one location choice is required
    if (hasLocationId === hasCustomLocation) {
      return res.status(400).json({
        success: false,
        message:
          "Select a registered location OR provide a custom location description",
      });
    }

    let locationIdNumber = null;

    if (hasLocationId) {
      locationIdNumber = Number(locationId);

      if (
        !Number.isInteger(locationIdNumber) ||
        locationIdNumber <= 0
      ) {
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

    // 7. Create complaint and initial history transactionally
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          title: cleanTitle,
          description: cleanDescription,
          priority: complaintPriority,
          reportedById: Number(req.user.userId),
          categoryId: categoryIdNumber,

          // Registered location OR custom location
          locationId: hasLocationId
            ? locationIdNumber
            : null,

          locationDescription: hasCustomLocation
            ? cleanLocationDescription
            : null,
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

    const complaints = await prisma.complaint.findMany({
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
    });

    return res.json({ success: true, complaints });
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
    // Students can view only their own complaints
    // if (
    //   req.user.roleName === "STUDENT" &&
    //   complaint.reportedById !== req.user.userId
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You do not have permission to view this complaint",
    //   });
    // }

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

    const roleName = user.role.name;

    // --------------------------------------------------
    // STUDENTS
    // --------------------------------------------------
    if (roleName === "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Students cannot update complaint status",
      });
    }

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
    // Clean note
    // --------------------------------------------------
    const cleanNote =
      typeof note === "string" && note.trim() ? note.trim() : null;

    // ==================================================
    // UPDATE + HISTORY ATOMICALLY
    // ==================================================
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
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
      await tx.complaintStatusHistory.create({
        data: {
          complaintId,
          oldStatus: currentStatus,
          newStatus: status,
          changedById: req.user.userId,
          note: cleanNote,
        },
      });

      return complaint;
    });

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
};
