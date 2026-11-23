const bookingService = require('../services/booking.service');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const booking = await bookingService.createBooking(req.body, req.user);
      res.status(201).json({
        success: true,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookings(req, res, next) {
    try {
      const result = await bookingService.getBookings(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const booking = await bookingService.updateBookingStatus(
        req.params.id,
        req.body,
        req.user
      );
      res.status(200).json({
        success: true,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async handleBookingModification(req, res, next) {
    try {
      const booking = await bookingService.handleBookingModification(
        req.params.id,
        req.body,
        req.user
      );
      res.status(200).json({
        success: true,
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRentalSummary(req, res, next) {
    try {
      const summary = await bookingService.getRentalSummary(req.user);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
