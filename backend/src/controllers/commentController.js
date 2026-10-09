const prisma = require("../config/prisma");

// ======================================================
// GET COMMENTS FOR A COMPLAINT
// ======================================================
const getComplaintComments = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);

    // Validate complaint ID
    if (!Number.isInteger(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    // Check that complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Get comments
    const comments = await prisma.complaintComment.findMany({
      where: {
        complaintId: complaintId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Get complaint comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load complaint comments.",
    });
  }
};

// ======================================================
// CREATE COMMENT
// ======================================================
const createComplaintComment = async (req, res) => {
  try {
    const complaintId = Number(req.params.id);

    const { comment } = req.body;

    // --------------------------------------------------
    // GET USER ID FROM JWT
    // --------------------------------------------------
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID is missing.",
      });
    }

    // --------------------------------------------------
    // VALIDATE COMPLAINT ID
    // --------------------------------------------------
    if (!Number.isInteger(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID.",
      });
    }

    // --------------------------------------------------
    // VALIDATE COMMENT
    // --------------------------------------------------
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment is required.",
      });
    }

    if (comment.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 2000 characters.",
      });
    }

    // --------------------------------------------------
    // FIND COMPLAINT
    // --------------------------------------------------
    const complaint = await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
      select: {
        id: true,
        reportedById: true,
        departmentId: true,
        status: true,
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // --------------------------------------------------
    // GET CURRENT USER
    // --------------------------------------------------
    const currentUser = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
      include: {
        role: true,
      },
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    // --------------------------------------------------
    // GET ROLE
    // --------------------------------------------------
    const role = currentUser.role.name;

    // --------------------------------------------------
    // STUDENT
    // Can comment only on their own complaint
    // --------------------------------------------------
    if (role === "STUDENT") {
      if (complaint.reportedById !== currentUser.id) {
        return res.status(403).json({
          success: false,
          message: "Students can comment only on their own complaints.",
        });
      }
    }

    // --------------------------------------------------
    // DEPARTMENT OFFICER
    // Can comment only on complaints assigned
    // to their department
    // --------------------------------------------------
    if (role === "DEPARTMENT_OFFICER") {
      if (
        !currentUser.departmentId ||
        complaint.departmentId !== currentUser.departmentId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can comment only on complaints assigned to your department.",
        });
      }
    }

    // --------------------------------------------------
    // STAFF AND ADMIN
    // They are allowed to comment.
    // --------------------------------------------------

    // --------------------------------------------------
    // CLOSED / REJECTED
    // No new comments after final status
    // --------------------------------------------------
    if (complaint.status === "CLOSED" || complaint.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "Comments cannot be added to a closed or rejected complaint.",
      });
    }

    // --------------------------------------------------
    // CREATE COMMENT
    // --------------------------------------------------
    const newComment = await prisma.complaintComment.create({
      data: {
        comment: comment.trim(),

        // Connect comment to complaint
        complaint: {
          connect: {
            id: complaintId,
          },
        },

        // Connect comment to logged-in user
        user: {
          connect: {
            id: currentUser.id,
          },
        },
      },

      // Return user information
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    console.error("Create complaint comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment.",
    });
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================
module.exports = {
  getComplaintComments,
  createComplaintComment,
};
