const fs = require('fs');
const path = require('path');
const StorageProvider = require('./storage.interface');
const config = require('../../config/env');

class LocalStorageProvider extends StorageProvider {
  constructor(baseDir = config.uploadDir) {
    super();
    this.baseDir = path.resolve(baseDir);
    this.ensureDirs();
  }

  ensureDirs() {
    const imagesDir = path.join(this.baseDir, 'images');
    const docsDir = path.join(this.baseDir, 'documents');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  }

  async saveFile(buffer, filename, subfolder = 'images') {
    this.ensureDirs();
    const safeSubfolder = subfolder === 'documents' ? 'documents' : 'images';
    const cleanFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationPath = path.join(this.baseDir, safeSubfolder, cleanFilename);

    await fs.promises.writeFile(destinationPath, buffer);

    const relativeUrl = `/uploads/${safeSubfolder}/${cleanFilename}`;
    return {
      url: relativeUrl,
      path: path.join(safeSubfolder, cleanFilename),
      filename: cleanFilename,
      size: buffer.length,
    };
  }

  async deleteFile(relativePath) {
    try {
      const fullPath = path.join(this.baseDir, relativePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getFilePath(relativePath) {
    const fullPath = path.resolve(this.baseDir, relativePath);
    // Path traversal check
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error('Access denied: invalid file path');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    return fullPath;
  }
}

module.exports = new LocalStorageProvider();
