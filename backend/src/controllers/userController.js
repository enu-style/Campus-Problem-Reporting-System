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

// ======================================================
// CREATE USER
// ADMIN ONLY
// ======================================================
const createUser = async (req, res) => {
  try {
    const { fullName, email, password, roleId, departmentId } = req.body;

    if (!fullName || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, password and role are required",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        id: Number(roleId),
      },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: {
          id: Number(departmentId),
        },
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
        fullName,
        email,
        passwordHash,
        roleId: Number(roleId),
        departmentId: departmentId ? Number(departmentId) : null,
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

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
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
    const userId = Number(req.params.id);

    const { fullName, email, roleId, departmentId, password } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    if (roleId) {
      const role = await prisma.role.findUnique({
        where: {
          id: Number(roleId),
        },
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }
    }

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: {
          id: Number(departmentId),
        },
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }
    }

    const updateData = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (roleId !== undefined) {
      updateData.roleId = Number(roleId);
    }

    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? Number(departmentId) : null;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

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

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating user",
    });
  }
};

// ======================================================
// DELETE USER
// ADMIN ONLY
// ======================================================
const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Prevent admin from deleting their own account
    if (req.user.userId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check whether this user has submitted complaints
    const complaintCount = await prisma.complaint.count({
      where: {
        reportedById: userId,
      },
    });

    if (complaintCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This user cannot be deleted because they have submitted complaints",
      });
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
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
