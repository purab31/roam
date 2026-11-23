const Settings = require('../models/settings.model');

class SettingsService {
  constructor() {
    this.cachedSettings = null;
  }

  /**
   * Retrieves current platform settings, using memory cache when available.
   * Creates default settings if none exist yet.
   */
  async getSettings() {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) {
      settings = await Settings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    this.cachedSettings = settings.toObject();
    return this.cachedSettings;
  }

  /**
   * Updates platform settings and updates the in-memory cache.
   */
  async updateSettings(updateData) {
    const update = {};

    if (typeof updateData.dealerVerificationRequired === 'boolean') {
      update.dealerVerificationRequired = updateData.dealerVerificationRequired;
    }

    if (typeof updateData.listingExpiryDays === 'number') {
      update.listingExpiryDays = updateData.listingExpiryDays;
    }

    if (Array.isArray(updateData.categories)) {
      update.categories = updateData.categories;
    }

    if (updateData.announcementBar) {
      update.announcementBar = {
        message1: updateData.announcementBar.message1 || '',
        message2: updateData.announcementBar.message2 || '',
        linkText: updateData.announcementBar.linkText || '',
        linkUrl: updateData.announcementBar.linkUrl || '',
      };
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    this.cachedSettings = settings.toObject();
    return this.cachedSettings;
  }

  /**
   * Public announcement bar data: returns null if message1 is empty.
   */
  async getPublicAnnouncement() {
    const settings = await this.getSettings();
    const ab = settings.announcementBar;
    if (!ab || !ab.message1) {
      return null;
    }
    return {
      message1: ab.message1,
      message2: ab.message2,
      linkText: ab.linkText,
      linkUrl: ab.linkUrl,
    };
  }

  /**
   * Helper checking if dealer verification is currently required.
   */
  async isDealerVerificationRequired() {
    const settings = await this.getSettings();
    return !!settings.dealerVerificationRequired;
  }
}

module.exports = new SettingsService();
