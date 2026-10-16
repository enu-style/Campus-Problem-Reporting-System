const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "../../uploads/complaints");

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },

  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validExtensions = allowedTypes[file.mimetype];

    if (!validExtensions || !validExtensions.includes(extension)) {
      return callback(
        new Error("Only JPEG, PNG, WebP, and PDF files are allowed."),
      );
    }

    callback(null, true);
  },
});

const handleComplaintUpload = (req, res, next) => {
  upload.array("attachments", 5)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (req.files?.length) {
      for (const file of req.files) {
        fs.promises.unlink(file.path).catch(() => {});
      }
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each attachment must be 5 MB or smaller."
          : error.code === "LIMIT_FILE_COUNT"
            ? "You can attach at most 5 files."
            : "File upload failed. Please check your attachments.";

      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid attachment.",
    });
  });
};

module.exports = handleComplaintUpload;
