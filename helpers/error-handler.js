function errorHandler(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ message: "Unauthorized access" });
    }
  
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
  
    // Other error handling logic
    return res.status(500).json({ message: "Internal server error" });
  }
  
  module.exports = errorHandler;
  