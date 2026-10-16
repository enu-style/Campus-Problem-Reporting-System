const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// ======================================================
// REGISTER
// ======================================================
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    // 1. Validate required fields
    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || cleanFullName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must contain at least 2 characters",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // 2. Find the STUDENT role on the server.
    // Never accept a roleId supplied by a public registration request.
    const studentRole = await prisma.role.findUnique({
      where: { name: "STUDENT" },
    });

    if (!studentRole) {
      console.error("Registration failed: STUDENT role was not found.");

      return res.status(500).json({
        success: false,
        message: "Student registration is not configured correctly",
      });
    }

    // 3. Check for an existing account
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // 4. Hash the password before saving it
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create a student account.
    // Role and department are controlled by the server.
    const user = await prisma.user.create({
      data: {
        fullName: cleanFullName,
        email: cleanEmail,
        passwordHash,
        roleId: studentRole.id,
        departmentId: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
        role: {
          select: { name: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Student account registered successfully",
      user,
    });
  } catch (error) {
    // Handle duplicate-email conflicts, including concurrent requests.
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// ======================================================
// LOGIN
// ======================================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim(),
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        roleId: user.roleId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ======================================================
// UPDATE PROFILE
// ======================================================
const updateProfile = async (req, res) => {
  try {
    // The auth middleware should put the decoded JWT here
    const userId = req.user.userId;

    const { fullName, email } = req.body;

    // Validate input
    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName) {
      return res.status(400).json({
        success: false,
        message: "Full name cannot be empty",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email cannot be empty",
      });
    }

    // Check if another user already uses this email
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName: cleanFullName,
        email: cleanEmail,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        departmentId: true,
      },
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

const forgotPassword = async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
    const devResetEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_PASSWORD_RESET_LINK === "true";



if (
  !process.env.FRONTEND_URL ||
  (!devResetEnabled &&
    (!process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS))
) {
  return res.status(503).json({
    success: false,
    message: "Password reset email is not configured yet",
  });
}
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

    
const resetUrl =
  `${process.env.FRONTEND_URL.replace(/\/$/, "")}` +
  `/reset-password?token=${rawToken}`;

if (devResetEnabled) {
  return res.json({
    success: true,
    message: "Development password reset link created. It expires in 15 minutes.",
    resetUrl,
  });
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: "Reset your Campus Reporting password",
    text:
      "You requested a password reset.\n\n" +
      `Open this link within 15 minutes: ${resetUrl}\n\n` +
      "If you did not request this, ignore this email.",
  });
} catch (emailError) {
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });
  throw emailError;
}

    }

    return res.json({
      success: true,
      message:
        "If an account exists for that email, password reset instructions will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to process the password reset request",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid reset token and password of at least 8 characters are required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or expired. Request a new link.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          id: resetRecord.id,
          tokenHash,
          expiresAt: { gt: new Date() },
        },
      });

      if (consumed.count !== 1) {
        throw new Error("RESET_TOKEN_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId: resetRecord.userId },
      });
    });

    return res.json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    if (error.message === "RESET_TOKEN_ALREADY_USED") {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid, expired, or already used",
      });
    }

    console.error("Reset password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  forgotPassword,
  resetPassword,
};

