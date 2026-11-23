const { ValidationError } = require('../../errors');

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Checks magic numbers (file signature) of a buffer to verify file type authenticity.
 * @param {Buffer} buffer
 * @returns {'jpeg'|'png'|'webp'|'pdf'|null}
 */
function detectFileSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF ... WEBP
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;
  if (isRiff && isWebp) {
    return 'webp';
  }

  // PDF: 25 50 44 46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  return null;
}

/**
 * Validates an image file buffer, mime type, and size.
 * @param {Object} file { buffer, mimetype, size, originalname }
 */
function validateImageFile(file) {
  if (!file || !file.buffer) {
    throw new ValidationError('No image file uploaded');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new ValidationError(
      `Image size exceeds maximum allowed limit of 5MB (${Math.round(file.size / (1024 * 1024))}MB uploaded)`
    );
  }

  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    throw new ValidationError(
      `Unsupported image format '${file.mimetype}'. Allowed formats: JPEG, PNG, WebP`
    );
  }

  const detected = detectFileSignature(file.buffer);
  if (!detected || (detected !== 'jpeg' && detected !== 'png' && detected !== 'webp')) {
    throw new ValidationError(
      'Corrupted image or mismatched file signature. File content does not match image header.'
    );
  }

  return true;
}

/**
 * Validates a document file buffer, mime type, and size.
 * @param {Object} file { buffer, mimetype, size, originalname }
 */
function validateDocumentFile(file) {
  if (!file || !file.buffer) {
    throw new ValidationError('No document file uploaded');
  }

  if (file.size > MAX_DOC_SIZE) {
    throw new ValidationError(
      `Document size exceeds maximum allowed limit of 10MB (${Math.round(file.size / (1024 * 1024))}MB uploaded)`
    );
  }

  if (!ALLOWED_DOC_MIMES.includes(file.mimetype)) {
    throw new ValidationError(
      `Unsupported document format '${file.mimetype}'. Allowed formats: PDF, JPEG, PNG`
    );
  }

  const detected = detectFileSignature(file.buffer);
  if (!detected || (detected !== 'pdf' && detected !== 'jpeg' && detected !== 'png')) {
    throw new ValidationError(
      'Corrupted document or mismatched file signature. File content does not match declared type.'
    );
  }

  return true;
}

module.exports = {
  detectFileSignature,
  validateImageFile,
  validateDocumentFile,
  MAX_IMAGE_SIZE,
  MAX_DOC_SIZE,
};
