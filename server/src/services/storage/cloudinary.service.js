const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const StorageProvider = require('./storage.interface');
const localStorageService = require('./localStorage.service');
const config = require('../../config/env');

class CloudinaryStorageProvider extends StorageProvider {
  constructor() {
    super();
    if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
      cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
        secure: true,
      });
    }
  }

  /**
   * Saves a file.
   * Public images are uploaded to Cloudinary CDN.
   * Sensitive private documents (RC, PAN, Aadhaar, Trade Certificates) are stored
   * on local disk storage behind the authenticated streaming route to prevent
   * exposing sensitive customer legal documents on public CDN URLs.
   */
  async saveFile(buffer, filename, subfolder = 'images') {
    if (subfolder === 'documents') {
      return localStorageService.saveFile(buffer, filename, 'documents');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'roam/images',
          resource_type: 'image',
          public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            path: result.public_id,
            filename: result.original_filename || filename,
            size: result.bytes || buffer.length,
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete a file from Cloudinary (for images) or local storage (for documents).
   */
  async deleteFile(relativePath) {
    if (!relativePath) return false;

    if (relativePath.startsWith('roam/')) {
      try {
        const res = await cloudinary.uploader.destroy(relativePath);
        return res.result === 'ok';
      } catch {
        return false;
      }
    }

    return localStorageService.deleteFile(relativePath);
  }

  /**
   * Returns local file path for authenticated document streaming.
   */
  async getFilePath(relativePath) {
    return localStorageService.getFilePath(relativePath);
  }
}

module.exports = CloudinaryStorageProvider;
