const Vehicle = require('../models/vehicle.model');
const Listing = require('../models/listing.model');
const notificationService = require('./notification.service');
const { transitionModerationStatus } = require('./listingStateMachine');
const localStorageService = require('./storage/localStorage.service');
const { validateImageFile, validateDocumentFile } = require('./storage/fileValidator');
const { NotFoundError, ForbiddenError, ConflictError } = require('../errors');

class VehicleService {
  /**
   * Creates a new vehicle record owned by the authenticated user/dealer.
   */
  async createVehicle(vehicleData, user) {
    const ownerRef = {
      type: user.capabilities.includes('dealer') ? 'dealer' : 'user',
      id: user._id,
    };

    const vehicle = await Vehicle.create({
      ...vehicleData,
      ownerRef,
      documents: [],
      images: [],
    });

    return vehicle.toOwnerObject();
  }

  /**
   * Retrieves vehicles belonging to the authenticated user.
   */
  async getMyVehicles(user) {
    const vehicles = await Vehicle.find({
      'ownerRef.id': user._id,
    }).sort({ createdAt: -1 });

    return vehicles.map(v => v.toOwnerObject());
  }

  /**
   * Retrieves a single vehicle by ID with public/owner sanitization.
   */
  async getVehicleById(id, user) {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const isOwnerOrAdmin =
      user &&
      (user.capabilities?.includes('admin') ||
        vehicle.ownerRef.id.toString() === user._id.toString());

    return isOwnerOrAdmin ? vehicle.toOwnerObject() : vehicle.toPublicObject();
  }

  /**
   * Helper that sends approved listings back to pending_review when key vehicle details or media change.
   */
  async triggerReReviewForVehicleListings(vehicleId, user, reason) {
    const approvedListings = await Listing.find({
      vehicleRef: vehicleId,
      moderationStatus: 'approved',
    });

    for (const listing of approvedListings) {
      transitionModerationStatus(listing, 'pending_review', {
        user,
        reason: `Re-review triggered: ${reason}`,
      });
      await listing.save();

      await notificationService.createNotification({
        recipient: listing.ownerRef.id,
        type: 'system',
        title: 'Listing Sent for Review',
        message: `Your listing has been returned to pending review following vehicle updates: ${reason}.`,
        relatedRef: { model: 'Listing', id: listing._id },
      });
    }
  }

  /**
   * Updates vehicle details.
   */
  async updateVehicle(id, updateData, user) {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const reReviewFields = [
      'brand',
      'model',
      'variant',
      'manufacturingYear',
      'registrationYear',
      'knownDefects',
      'serviceHistory',
      'accidentHistory',
      'features',
    ];

    const hasTriggerField = Object.keys(updateData).some(key => reReviewFields.includes(key));

    Object.assign(vehicle, updateData);
    await vehicle.save();

    if (hasTriggerField) {
      await this.triggerReReviewForVehicleListings(id, user, 'Vehicle specifications or condition updated');
    }

    return vehicle.toOwnerObject();
  }

  /**
   * Deletes a vehicle.
   * Spec requirement: Block DELETE on a vehicle while it has any non-removed listing!
   */
  async deleteVehicle(id, user) {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Check for active or non-removed listings for this vehicle
    const activeListingsCount = await Listing.countDocuments({
      vehicleRef: id,
      moderationStatus: { $ne: 'removed' },
    });

    if (activeListingsCount > 0) {
      throw new ConflictError(
        'Cannot delete vehicle while it has active or non-removed listings. Remove or archive associated listings first.',
        'ACTIVE_LISTINGS_EXIST'
      );
    }

    // Clean up uploaded files on disk
    for (const img of vehicle.images) {
      const relative = img.url.replace('/uploads/', '');
      await localStorageService.deleteFile(relative);
    }
    for (const doc of vehicle.documents) {
      const relative = doc.url.replace('/uploads/', '');
      await localStorageService.deleteFile(relative);
    }

    await Vehicle.findByIdAndDelete(id);
    return { success: true, message: 'Vehicle deleted successfully' };
  }

  /**
   * Adds an uploaded image to a vehicle.
   */
  async addImage(vehicleId, file, caption = '') {
    validateImageFile(file);

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const saved = await localStorageService.saveFile(file.buffer, file.originalname, 'images');

    const isFirstImage = vehicle.images.length === 0;
    const newImage = {
      url: saved.url,
      isCover: isFirstImage,
      order: vehicle.images.length,
      caption: caption || '',
    };

    vehicle.images.push(newImage);
    await vehicle.save();

    await this.triggerReReviewForVehicleListings(vehicleId, null, 'New photo added');

    return vehicle.toOwnerObject();
  }

  /**
   * Removes an image from a vehicle.
   */
  async removeImage(vehicleId, imageId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const imageIndex = vehicle.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      throw new NotFoundError('Image not found on this vehicle');
    }

    const removed = vehicle.images[imageIndex];
    vehicle.images.splice(imageIndex, 1);

    // If removed image was cover, make first remaining image the cover
    if (removed.isCover && vehicle.images.length > 0) {
      vehicle.images[0].isCover = true;
    }

    // Reassign order
    vehicle.images.forEach((img, idx) => {
      img.order = idx;
    });

    await vehicle.save();

    await this.triggerReReviewForVehicleListings(vehicleId, null, 'Photo removed');

    // Clean up file asynchronously
    const relative = removed.url.replace('/uploads/', '');
    await localStorageService.deleteFile(relative);

    return vehicle.toOwnerObject();
  }

  /**
   * Reorders images for a vehicle.
   */
  async reorderImages(vehicleId, imageIds) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const idMap = new Map();
    vehicle.images.forEach(img => {
      idMap.set(img._id.toString(), img);
    });

    const reordered = [];
    imageIds.forEach((id, idx) => {
      const img = idMap.get(id);
      if (img) {
        img.order = idx;
        reordered.push(img);
        idMap.delete(id);
      }
    });

    // Add any images not in the provided imageIds list at the end
    idMap.forEach(img => {
      img.order = reordered.length;
      reordered.push(img);
    });

    vehicle.images = reordered;
    await vehicle.save();

    return vehicle.toOwnerObject();
  }

  /**
   * Sets a specific image as the cover image.
   */
  async setCoverImage(vehicleId, imageId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    let found = false;
    vehicle.images.forEach(img => {
      if (img._id.toString() === imageId) {
        img.isCover = true;
        found = true;
      } else {
        img.isCover = false;
      }
    });

    if (!found) {
      throw new NotFoundError('Image not found on this vehicle');
    }

    await vehicle.save();
    await this.triggerReReviewForVehicleListings(vehicleId, null, 'Cover photo changed');
    return vehicle.toOwnerObject();
  }

  /**
   * Adds a private document to a vehicle.
   */
  async addDocument(vehicleId, file, name) {
    validateDocumentFile(file);

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const saved = await localStorageService.saveFile(file.buffer, file.originalname, 'documents');

    const newDoc = {
      name: name || file.originalname,
      url: saved.url,
      fileType: file.mimetype,
      size: saved.size,
      uploadedAt: new Date(),
    };

    vehicle.documents.push(newDoc);
    await vehicle.save();

    return vehicle.toOwnerObject();
  }

  /**
   * Retrieves file path for a private document after verifying owner/admin access.
   */
  async getDocumentPath(vehicleId, docId, user) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const isOwnerOrAdmin =
      user &&
      (user.capabilities?.includes('admin') ||
        vehicle.ownerRef.id.toString() === user._id.toString());

    if (!isOwnerOrAdmin) {
      throw new ForbiddenError('Access denied: document is private to the vehicle owner');
    }

    const doc = vehicle.documents.find(d => d._id.toString() === docId);
    if (!doc) {
      throw new NotFoundError('Document not found on this vehicle');
    }

    const relative = doc.url.replace('/uploads/', '');
    const fullPath = await localStorageService.getFilePath(relative);

    return {
      filePath: fullPath,
      name: doc.name,
      fileType: doc.fileType,
    };
  }

  /**
   * Removes a document from a vehicle.
   */
  async removeDocument(vehicleId, docId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const docIndex = vehicle.documents.findIndex(d => d._id.toString() === docId);
    if (docIndex === -1) {
      throw new NotFoundError('Document not found on this vehicle');
    }

    const removed = vehicle.documents[docIndex];
    vehicle.documents.splice(docIndex, 1);
    await vehicle.save();

    const relative = removed.url.replace('/uploads/', '');
    await localStorageService.deleteFile(relative);

    return vehicle.toOwnerObject();
  }
}

module.exports = new VehicleService();
