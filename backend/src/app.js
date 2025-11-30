// For Initialzing the express server - Connecting to server.ts further for running HTTP!
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRouts.js");
const profileRoutes = require("./routes/profileRoutes.js");
const jobRoutes = require("./routes/jobRoutes.js");

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://workin-self.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic GET route
app.get('/', (req, res) => {
  res.json({ message: 'Workin Backend API is running!', status: 'OK' });
});

app.use("/api/auth/", authRoutes);
app.use("/api/profile/", profileRoutes);
app.use("/api/jobs/", jobRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

module.exports = app;