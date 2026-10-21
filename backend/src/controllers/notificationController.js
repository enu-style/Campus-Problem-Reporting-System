const prisma = require("../config/prisma");

// ======================================================
// WHO SHOULD BE NOTIFIED ABOUT A COMPLAINT EVENT
// ======================================================
// Everyone related to the complaint except the actor who
// triggered the event:
//   - the student who reported it
//   - every staff member and administrator
//   - officers of the complaint's department (if assigned)
async function getComplaintAudience(complaint) {
  const audience = new Map();

  // Reporter (the student)
  audience.set(complaint.reportedById, "REPORTER");

  // Staff and administrators
  const staff = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ["STAFF", "ADMINISTRATOR"] } },
    },
    select: { id: true },
  });

  for (const user of staff) {
    audience.set(user.id, "STAFF");
  }

  // Department officers for the assigned department
  if (complaint.departmentId) {
    const officers = await prisma.user.findMany({
      where: {
        isActive: true,
        departmentId: complaint.departmentId,
        role: { name: "DEPARTMENT_OFFICER" },
      },
      select: { id: true },
    });

    for (const officer of officers) {
      audience.set(officer.id, "OFFICER");
    }
  }

  return [...audience.keys()];
}

// ======================================================
// CREATE NOTIFICATIONS FOR EVERYONE RELATED TO A COMPLAINT
// ======================================================
async function notifyComplaintParticipants({
  complaintId,
  actorId,
  type,
  message,
  audience,
}) {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        reportedById: true,
        departmentId: true,
      },
    });

    if (!complaint) {
      return [];
    }

    const recipientIds = (
      audience || (await getComplaintAudience(complaint))
    ).filter((userId) => userId !== actorId);

    if (recipientIds.length === 0) {
      return [];
    }

    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        complaintId,
        type,
        message,
      })),
    });

    return recipientIds;
  } catch (error) {
    // Notifications must never break the main request
    console.error("notifyComplaintParticipants error:", error.message);
    return [];
  }
}

// ======================================================
// GET MY NOTIFICATIONS
// ======================================================
const getMyNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          complaint: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
      }),

      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while loading notifications",
    });
  }
};

// ======================================================
// MARK ALL MY NOTIFICATIONS AS READ
// ======================================================
const markNotificationsRead = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      message: "Notifications marked as read",
      updated: result.count,
    });
  } catch (error) {
    console.error("Mark notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating notifications",
    });
  }
};

module.exports = {
  notifyComplaintParticipants,
  getMyNotifications,
  markNotificationsRead,
};
