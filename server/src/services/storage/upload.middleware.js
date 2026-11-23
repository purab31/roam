const multer = require('multer');
const { ValidationError } = require('../../errors');

// Use memoryStorage so we inspect the buffer and file signature before writing to disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max ceiling
  },
  fileFilter: (_req, file, cb) => {
    cb(null, true);
  },
});

module.exports = {
  upload,
};
