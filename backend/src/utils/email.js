const nodemailer = require("nodemailer");

// Create the SMTP transporter using environment variables.
// Required env vars: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Sender identity for outgoing emails
const FROM_EMAIL =
  process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@injibara.edu.et";
const FROM_NAME =
  process.env.MAIL_FROM_NAME || "Injibara Campus Reporting";

/**
 * Convert a complaint status enum into a human-readable label.
 * Example: "IN_PROGRESS" -> "in progress"
 */
function statusLabel(status) {
  return status.replace(/_/g, " ").toLowerCase();
}

/**
 * Build the plain-text body of a status notification email.
 */
function buildTextBody(studentName, complaint, changedBy, note) {
  const label = statusLabel(complaint.status);
  const noteLine = note ? `\nNote: ${note}` : "";

  return `Hello ${studentName},

Your complaint "${complaint.title}" (ID: #${complaint.id})
has been updated by ${changedBy}.

Current status: ${label}${noteLine}

Log in to the Campus Reporting System to track further updates.

---
Injibara University Campus Reporting System`;
}

/**
 * Build the HTML body of a status notification email.
 */
function buildHtmlBody(studentName, complaint, changedBy, note) {
  const label = statusLabel(complaint.status);
  const noteHtml = note ? `<p><strong>Note:</strong> ${note}</p>` : "";

  return `
    <h2>Update on your complaint</h2>
    <p>Hello <strong>${studentName}</strong>,</p>
    <p>Your complaint <strong>"${complaint.title}"</strong> (ID: #${complaint.id})
    has been updated by ${changedBy}.</p>
    <p><strong>Current status:</strong> ${label}</p>
    ${noteHtml}
    <p>Log in to the Campus Reporting System to track further updates.</p>
    <hr />
    <p><small>Injibara University Campus Reporting System</small></p>
  `;
}

/**
 * Send an email notification to a student when their complaint status changes.
 *
 * @param {string} to - Student email address
 * @param {string} studentName - Student full name
 * @param {object} complaint - Complaint object (id, title, status)
 * @param {string} changedBy - Name of the staff member who made the change
 * @param {string} note - Optional note about the change
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendComplaintStatusNotification(
  to,
  studentName,
  complaint,
  changedBy,
  note
) {
  const subjectMap = {
    REVIEWED: `Your complaint #${complaint.id} has been reviewed`,
    ASSIGNED: `Your complaint #${complaint.id} has been assigned`,
    RESOLVED: `Your complaint #${complaint.id} has been resolved`,
    REJECTED: `Your complaint #${complaint.id} has been rejected`,
  };

  const subject =
    subjectMap[complaint.status] ||
    `Update on your complaint #${complaint.id}`;

  const text = buildTextBody(studentName, complaint, changedBy, note);
  const html = buildHtmlBody(studentName, complaint, changedBy, note);

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email notification error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify that the SMTP transporter can connect to the mail server.
 * Useful for startup health checks.
 *
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function verifyConnection() {
  try {
    await transporter.verify();
    return { success: true, message: "Email server is ready" };
  } catch (error) {
    console.error("Email connection error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendComplaintStatusNotification,
  verifyConnection,
};