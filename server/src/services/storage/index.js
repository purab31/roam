const config = require('../../config/env');
const localStorageService = require('./localStorage.service');

let activeStorageService = localStorageService;

if (config.storageProvider === 'cloudinary') {
  const CloudinaryStorageProvider = require('./cloudinary.service');
  activeStorageService = new CloudinaryStorageProvider();
}

module.exports = activeStorageService;
