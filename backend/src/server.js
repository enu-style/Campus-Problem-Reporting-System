const userRoutes = require("./routes/userRoutes");
const express = require("express");
const categoryRoutes = require("./routes/categoryRoutes");
const locationRoutes = require("./routes/locationRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const commentRoutes = require("./routes/commentRoutes");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as curl.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/complaints", commentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Injibara University Campus Reporting API is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
