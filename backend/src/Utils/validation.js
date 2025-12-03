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

module.exports = { validatePagination };