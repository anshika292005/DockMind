const express = require("express");
const { createJob, getJobs, getJobById, updateJob, deleteJob, applyForJob, getApplications, getJobsByHR, getApplicationsByJob, updateApplicationStatus } = require("../controllers/jobController.js");

const router = express.Router();

// Specific routes first
router.post("/create/:hrId", createJob);
router.post("/apply/:jobId/:candidateId", applyForJob);
router.get("/applications/:candidateId", getApplications);
router.get("/hr/:hrId", getJobsByHR);
router.get("/:jobId/applications", getApplicationsByJob);
router.put("/applications/:applicationId/status", updateApplicationStatus);

// General routes last
router.get("/", getJobs);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

module.exports = router;