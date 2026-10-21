const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

// ======================================================
// GET ALL USERS
// ADMIN ONLY
// ======================================================
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,

        role: {
          select: {
            id: true,
            name: true,
          },
        },

        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while loading users",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: "A valid request body is required",
      });
    }

    const { fullName, email, password, roleId, departmentId } = body;

    // Validate required fields and their types
    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      roleId === undefined ||
      roleId === null ||
      (typeof roleId === "string" && roleId.trim() === "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, password and role are required",
      });
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate full name
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters",
      });
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length and bcrypt's 72-byte limit
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and no more than 72 UTF-8 bytes",
      });
    }

    // Validate role ID
    const parsedRoleId =
      typeof roleId === "number"
        ? roleId
        : typeof roleId === "string"
          ? Number(roleId.trim())
          : NaN;

    if (!Number.isSafeInteger(parsedRoleId) || parsedRoleId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Role ID must be a positive integer",
      });
    }

    // Department is optional; null or an empty form value means unassigned.
    let parsedDepartmentId = null;

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      departmentId !== ""
    ) {
      const validDepartmentInput =
        typeof departmentId === "number" ||
        (typeof departmentId === "string" && departmentId.trim() !== "");

      parsedDepartmentId = validDepartmentInput ? Number(departmentId) : NaN;

      if (
        !Number.isSafeInteger(parsedDepartmentId) ||
        parsedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Department ID must be a positive integer or null",
        });
      }
    }

    // Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Check that the selected role exists
    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Check the department only when one is assigned
    if (parsedDepartmentId !== null) {
      const department = await prisma.department.findUnique({
        where: { id: parsedDepartmentId },
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: normalizedName,
        email: normalizedEmail,
        passwordHash,
        roleId: parsedRoleId,
        departmentId: parsedDepartmentId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid role or department reference",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating user",
    });
  }
};

// ======================================================
// UPDATE USER
// ADMIN ONLY
// ======================================================

const updateUser = async (req, res) => {
  try {
    // 1. Validate the target user ID
    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // 2. Validate request body
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: "A valid request body is required",
      });
    }

    // Only these fields may be updated
    const allowedFields = [
      "fullName",
      "email",
      "roleId",
      "departmentId",
      "password",
    ];

    const suppliedFields = Object.keys(body);

    if (suppliedFields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({
        success: false,
        message: "Request contains unsupported fields",
      });
    }

    // Reject empty updates
    if (suppliedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const { fullName, email, roleId, departmentId, password } = body;

    // 3. Check whether the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {};

    // 4. Validate full name
    if (fullName !== undefined) {
      if (typeof fullName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Full name must be a string",
        });
      }

      const normalizedName = fullName.trim();

      if (normalizedName.length < 2 || normalizedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Full name must be between 2 and 100 characters",
        });
      }

      updateData.fullName = normalizedName;
    }

    // 5. Validate and normalize email
    if (email !== undefined) {
      if (typeof email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Email must be a string",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      if (normalizedEmail !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      updateData.email = normalizedEmail;
    }

    // 6. Validate role ID
    if (roleId !== undefined) {
      const parsedRoleId =
        typeof roleId === "number"
          ? roleId
          : typeof roleId === "string" && roleId.trim() !== ""
            ? Number(roleId.trim())
            : NaN;

      if (!Number.isSafeInteger(parsedRoleId) || parsedRoleId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Role ID must be a positive integer",
        });
      }

      const role = await prisma.role.findUnique({
        where: { id: parsedRoleId },
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      updateData.roleId = parsedRoleId;
    }

    // 7. Validate optional department ID
    // null or "" removes the department assignment
    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        updateData.departmentId = null;
      } else {
        const validDepartmentInput =
          typeof departmentId === "number" ||
          (typeof departmentId === "string" && departmentId.trim() !== "");

        const parsedDepartmentId = validDepartmentInput
          ? Number(departmentId)
          : NaN;

        if (
          !Number.isSafeInteger(parsedDepartmentId) ||
          parsedDepartmentId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Department ID must be a positive integer or null",
          });
        }

        const department = await prisma.department.findUnique({
          where: { id: parsedDepartmentId },
        });

        if (!department) {
          return res.status(400).json({
            success: false,
            message: "Invalid department",
          });
        }

        updateData.departmentId = parsedDepartmentId;
      }
    }

    // 8. Validate and hash a new password
    if (password !== undefined) {
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        Buffer.byteLength(password, "utf8") > 72
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters and no more than 72 UTF-8 bytes",
        });
      }

      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // 9. Update user and return safe fields only
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid role or department reference",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
};

// ======================================================
// DELETE USER
// ADMIN ONLY
// Preserve complaints, comments, and status history
// ======================================================
const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // Require a valid positive integer ID
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Prevent an administrator from deleting their own account
    if (Number(req.user.userId) === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check all records that reference this user.
    const [complaintCount, commentCount, statusChangeCount] = await Promise.all(
      [
        prisma.complaint.count({
          where: { reportedById: userId },
        }),
        prisma.complaintComment.count({
          where: { userId },
        }),
        prisma.complaintStatusHistory.count({
          where: { changedById: userId },
        }),
      ],
    );

    if (complaintCount > 0 || commentCount > 0 || statusChangeCount > 0) {
      // Soft delete: preserve the account and its complaint/comment
      // history, but deactivate it so the user can no longer log in
      // or appear as an active account.
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message:
          "User has related complaint records, so the account was deactivated (soft delete) instead of deleted.",
        softDeleted: true,
        relatedRecords: {
          complaints: complaintCount,
          comments: commentCount,
          statusChanges: statusChangeCount,
        },
      });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    // Handle foreign-key constraints safely
    if (error.code === "P2003" || error.code === "P2014") {
      return res.status(409).json({
        success: false,
        message:
          "This user is still referenced by other records and cannot be deleted.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while deleting user",
    });
  }
};
module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
