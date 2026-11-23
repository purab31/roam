/**
 * Storage provider interface for Roam media uploads.
 */
class StorageProvider {
  /**
   * Save a file buffer to storage.
   * @param {Buffer} buffer
   * @param {string} filename
   * @param {string} subfolder ('images' or 'documents')
   * @returns {Promise<{ url: string, path: string, size: number }>}
   */
  async saveFile(_buffer, _filename, _subfolder) {
    throw new Error('saveFile() must be implemented by storage provider');
  }

  /**
   * Delete a file from storage.
   * @param {string} relativePath
   * @returns {Promise<boolean>}
   */
  async deleteFile(_relativePath) {
    throw new Error('deleteFile() must be implemented by storage provider');
  }

  /**
   * Get the absolute path or stream for reading a private file.
   * @param {string} relativePath
   * @returns {Promise<string>}
   */
  async getFilePath(_relativePath) {
    throw new Error('getFilePath() must be implemented by storage provider');
  }
}

module.exports = StorageProvider;
