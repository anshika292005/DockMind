const prisma = require("../db/prisma.js");

const validatePagination = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return { error: "Invalid page number" };
  }
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
    return { error: "Invalid limit (1-100)" };
  }
  
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const createJob = async (req, res) => {
  const { title, company, location, description, requirements, salary, type } = req.body;
  const { hrId } = req.params;
  
  if (!title || !company || !location || !description || !requirements) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }
  
  // Sanitize inputs
  const sanitizedData = {
    title: typeof title === 'string' ? title.trim() : '',
    company: typeof company === 'string' ? company.trim() : '',
    location: typeof location === 'string' ? location.trim() : '',
    description: typeof description === 'string' ? description.trim() : '',
    requirements: typeof requirements === 'string' ? requirements.trim() : '',
    salary: salary && typeof salary === 'string' ? salary.trim() : null,
    type: type && typeof type === 'string' ? type.trim() : 'full-time'
  };
  
  const hrIdNum = parseInt(hrId);
  if (!Number.isInteger(hrIdNum) || hrIdNum < 1) {
    return res.status(400).json({ message: "Invalid HR ID" });
  }
  
  try {
    const job = await prisma.job.create({
      data: { 
        title: sanitizedData.title, 
        company: sanitizedData.company, 
        location: sanitizedData.location, 
        description: sanitizedData.description, 
        requirements: sanitizedData.requirements, 
        salary: sanitizedData.salary, 
        type: sanitizedData.type, 
        hrId: hrIdNum 
      }
    });
    return res.status(201).json({ message: "Job created successfully", job });
  } catch (err) {
    console.error('Job creation error:', err);
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
};

const getJobs = async (req, res) => {
  const { 
    search, 
    location, 
    skills, 
    company,
    type,
    salaryMin,
    salaryMax,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1, 
    limit = 10 
  } = req.query;
  
  const validation = validatePagination(page, limit);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }
  const { pageNum, limitNum, skip } = validation;
  
  // Build filter conditions
  const whereClause = {};
  const conditions = [];
  
  if (search) {
    conditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requirements: { contains: search, mode: 'insensitive' } }
      ]
    });
  }
  
  if (location) conditions.push({ location: { contains: location, mode: 'insensitive' } });
  if (company) conditions.push({ company: { contains: company, mode: 'insensitive' } });
  if (type) conditions.push({ type: { equals: type } });
  if (skills) conditions.push({ requirements: { contains: skills, mode: 'insensitive' } });
  
  // Salary filtering
  if (salaryMin || salaryMax) {
    const salaryConditions = [];
    if (salaryMin) salaryConditions.push({ salary: { contains: salaryMin } });
    if (salaryMax) salaryConditions.push({ salary: { contains: salaryMax } });
    if (salaryConditions.length > 0) {
      conditions.push({ OR: salaryConditions });
    }
  }
  
  if (conditions.length > 0) {
    whereClause.AND = conditions;
  }
  
  // Build sort options
  const validSortFields = ['createdAt', 'title', 'company', 'location', 'type'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  
  const orderBy = { [sortField]: sortDirection };
  
  try {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        include: { hr: { select: { name: true, email: true } } },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.job.count({ where: whereClause })
    ]);
    
    return res.status(200).json({
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        search,
        location,
        company,
        type,
        skills,
        salaryMin,
        salaryMax,
        sortBy: sortField,
        sortOrder: sortDirection
      }
    });
  } catch (err) {
    console.error('Database error in getJobs:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getJobById = async (req, res) => {
  const { id } = req.params;
  
  const jobId = parseInt(id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ message: "Invalid job ID" });
  }
  
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { hr: { select: { name: true, email: true } } }
    });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    return res.status(200).json(job);
  } catch (err) {
    console.error('Database error in getJobById:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, company, location, description, requirements, salary, type } = req.body;
  
  const jobId = parseInt(id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ message: "Invalid job ID" });
  }
  
  try {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: { title, company, location, description, requirements, salary, type }
    });
    return res.status(200).json({ message: "Job updated successfully", job });
  } catch (err) {
    console.error('Database error in updateJob:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;
  
  const jobId = parseInt(id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ message: "Invalid job ID" });
  }
  
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    await prisma.job.delete({ where: { id: jobId } });
    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error('Database error in deleteJob:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const applyForJob = async (req, res) => {
  const { jobId, candidateId } = req.params;
  
  const jobIdNum = parseInt(jobId);
  const candidateIdNum = parseInt(candidateId);
  
  if (!Number.isInteger(jobIdNum) || jobIdNum < 1) {
    return res.status(400).json({ message: "Invalid job ID" });
  }
  if (!Number.isInteger(candidateIdNum) || candidateIdNum < 1) {
    return res.status(400).json({ message: "Invalid candidate ID" });
  }
  
  try {
    // Validate job and candidate exist
    const [job, candidate] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobIdNum } }),
      prisma.users.findUnique({ where: { id: candidateIdNum } })
    ]);
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    
    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: jobIdNum, candidateId: candidateIdNum } }
    });
    
    if (existingApplication) {
      return res.status(400).json({ message: "Already applied for this job" });
    }
    
    const application = await prisma.application.create({
      data: { jobId: jobIdNum, candidateId: candidateIdNum, status: 'pending' }
    });
    
    return res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    console.error('Apply for job error:', err);
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
};

const getApplications = async (req, res) => {
  const { candidateId } = req.params;
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  const candidateIdNum = parseInt(candidateId);
  if (!Number.isInteger(candidateIdNum) || candidateIdNum < 1) {
    return res.status(400).json({ message: "Invalid candidate ID" });
  }
  
  const validation = validatePagination(page, limit);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }
  const { pageNum, limitNum, skip } = validation;
  
  // Build filter conditions
  const whereClause = { candidateId: candidateIdNum };
  if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
    whereClause.status = status;
  }
  
  // Build sort options
  const validSortFields = ['createdAt', 'status'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  
  try {
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        include: { job: { include: { hr: { select: { name: true } } } } },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum
      }),
      prisma.application.count({ where: whereClause })
    ]);
    
    return res.status(200).json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Database error in getApplications:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getJobsByHR = async (req, res) => {
  const { hrId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  const hrIdNum = parseInt(hrId);
  if (!Number.isInteger(hrIdNum) || hrIdNum < 1) {
    return res.status(400).json({ message: "Invalid HR ID" });
  }
  
  const validation = validatePagination(page, limit);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }
  const { pageNum, limitNum, skip } = validation;
  
  // Build sort options
  const validSortFields = ['createdAt', 'title', 'company', 'location', 'type'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  
  try {
    console.log('Fetching jobs for HR ID:', hrIdNum);
    
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: { hrId: hrIdNum },
        include: { hr: { select: { name: true, email: true } } },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum
      }),
      prisma.job.count({ where: { hrId: hrIdNum } })
    ]);
    
    console.log('Found jobs:', jobs.length, 'Total:', total);
    
    return res.status(200).json({
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Database error in getJobsByHR:', err.message);
    console.error('Full error:', err);
    return res.status(500).json({ message: "Database connection error: " + err.message });
  }
};

const getApplicationsByJob = async (req, res) => {
  const { jobId } = req.params;
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  const jobIdNum = parseInt(jobId);
  if (!Number.isInteger(jobIdNum) || jobIdNum < 1) {
    return res.status(400).json({ message: "Invalid job ID" });
  }
  
  const validation = validatePagination(page, limit);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }
  const { pageNum, limitNum, skip } = validation;
  
  // Build filter conditions
  const whereClause = { jobId: jobIdNum };
  if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
    whereClause.status = status;
  }
  
  // Build sort options
  const validSortFields = ['createdAt', 'status'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  
  try {
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: whereClause,
        include: { 
          candidate: { select: { name: true, email: true, phoneNumber: true } },
          job: { select: { title: true, company: true, location: true, type: true } }
        },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limitNum
      }),
      prisma.application.count({ where: whereClause })
    ]);
    
    return res.status(200).json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Database error in getApplicationsByJob:', err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const updateApplicationStatus = async (req, res) => {
  const { applicationId } = req.params;
  const { status, response } = req.body;
  
  const appId = parseInt(applicationId);
  if (!Number.isInteger(appId) || appId < 1) {
    return res.status(400).json({ message: "Invalid application ID" });
  }
  
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  
  try {
    const application = await prisma.application.update({
      where: { id: appId },
      data: { status, response: response || null, updatedAt: new Date() }
    });
    
    return res.status(200).json({ message: "Application status updated successfully", application });
  } catch (err) {
    console.error('Update application status error:', err);
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
};

module.exports = { createJob, getJobs, getJobById, updateJob, deleteJob, applyForJob, getApplications, getJobsByHR, getApplicationsByJob, updateApplicationStatus };