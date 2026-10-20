const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@injibara.edu.et";
const FROM_NAME = process.env.MAIL_FROM_NAME || "Injibara Campus Reporting";

async function sendComplaintStatusNotification(to, studentName, complaint, changedBy, note) {
  const statusLabel = complaint.status.replace(/_/g, " ").toLowerCase();
  let subject, text, html;

  if (complaint.status === "REVIEWED") {
    subject = "Your complaint #" + complaint.id + " has been reviewed";
    text = "Hello " + studentName + ",\n\nYour complaint " + complaint.title + " (ID: #" + complaint.id + ") has been reviewed by " + changedBy + ".\n\nCurrent status: " + statusLabel + "\n" + (note ? "\nNote: " + note : "") + "\n\nLog in to track updates.\n\n---\nInjibara University Campus Reporting System";
    html = "<h2>Your complaint has been reviewed</h2><p>Hello <strong>" + studentName + "</strong>,</p><p>Your complaint <strong>" + complaint.title + "</strong> (ID: #" + complaint.id + ") has been reviewed by " + changedBy + ".</p><p><strong>Status:</strong> " + statusLabel + "</p>" + (note ? "<p><strong>Note:</strong> " + note + "</p>" : "") + "<p>Log in to track updates.</p><hr /><p><small>Injibara University Campus Reporting System</small></p>";
  } else if (complaint.status === "ASSIGNED") {
    subject = "Your complaint #" + complaint.id + " has been assigned";
    text = "Hello " + studentName + ",\n\nYour complaint " + complaint.title + " (ID: #" + complaint.id + ") has been assigned to " + changedBy + ".\n\nCurrent status: " + statusLabel + "\n" + (note ? "\nNote: " + note : "") + "\n\nLog in to track updates.\n\n---\nInjibara University Campus Reporting System";
    html = "<h2>Your complaint has been assigned</h2><p>Hello <strong>" + studentName + "</strong>,</p><p>Your complaint <strong>" + complaint.title + "</strong> (ID: #" + complaint.id + ") has been assigned to " + changedBy + ".</p><p><strong>Status:</strong> " + statusLabel + "</p>" + (note ? "<p><strong>Note:</strong> " + note + "</p>" : "") + "<p>Log in to track updates.</p><hr /><p><small>Injibara University Campus Reporting System</small></p>";
  } else if (complaint.status === "RESOLVED") {
    subject = "Your complaint #" + complaint.id + " has been resolved";
    text = "Hello " + studentName + ",\n\nYour complaint " + complaint.title + " (ID: #" + complaint.id + ") has been resolved by " + changedBy + ".\n\nCurrent status: " + statusLabel + "\n" + (note ? "\nNote: " + note : "") + "\n\nLog in for more details.\n\n---\nInjibara University Campus Reporting System";
    html = "<h2>Your complaint has been resolved</h2><p>Hello <strong>" + studentName + "</strong>,</p><p>Your complaint <strong>" + complaint.title + "</strong> (ID: #" + complaint.id + ") has been resolved by " + changedBy + ".</p><p><strong>Status:</strong> " + statusLabel + "</p>" + (note ? "<p><strong>Note:</strong> " + note + "</p>" : "") + "<p>Log in for more details.</p><hr /><p><small>Injibara University Campus Reporting System</small></p>";
  } else if (complaint.status === "REJECTED") {
    subject = "Your complaint #" + complaint.id + " has been rejected";
    text = "Hello " + studentName + ",\n\nYour complaint " + complaint.title + " (ID: #" + complaint.id + ") has been rejected by " + changedBy + ".\n\nCurrent status: " + statusLabel + "\n" + (note ? "\nNote: " + note : "") + "\n\nContact the department if you disagree.\n\n---\nInjibara University Campus Reporting System";
    html = "<h2>Your complaint has been rejected</h2><p>Hello <strong>" + studentName + "</strong>,</p><p>Your complaint <strong>" + complaint.title + "</strong> (ID: #" + complaint.id + ") has been rejected by " + changedBy + ".</p><p><strong>Status:</strong> " + statusLabel + "</p>" + (note ? "<p><strong>Note:</strong> " + note + "</p>" : "") + "<p>Contact the department if you disagree.</p><hr /><p><small>Injibara University Campus Reporting System</small></p>";
  } else {
    subject = "Update on your complaint #" + complaint.id;
    text = "Hello " + studentName + ",\n\nYour complaint " + complaint.title + " (ID: #" + complaint.id + ") has been updated by " + changedBy + ".\n\nCurrent status: " + statusLabel + "\n" + (note ? "\nNote: " + note : "") + "\n\nLog in for details.\n\n---\nInjibara University Campus Reporting System";
    html = "<h2>Update on your complaint</h2><p>Hello <strong>" + studentName + "</strong>,</p><p>Your complaint <strong>" + complaint.title + "</strong> (ID: #" + complaint.id + ") has been updated by " + changedBy + ".</p><p><strong>Status:</strong> " + statusLabel + "</p>" + (note ? "<p><strong>Note:</strong> " + note + "</p>" : "") + "<p>Log in for details.</p><hr /><p><small>Injibara University Campus Reporting System</small></p>";
  }

  try {
    await transporter.sendMail({
      from: '"' + FROM_NAME + '" <' + FROM_EMAIL + ">",
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