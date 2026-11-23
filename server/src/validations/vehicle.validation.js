const { z } = require('zod');

const currentYear = new Date().getFullYear();

const vehicleBaseSchema = z.object({
  brand: z.string().min(1, 'Brand is required').trim(),
  model: z.string().min(1, 'Model is required').trim(),
  variant: z.string().trim().optional(),
  bodyType: z.enum(
    [
      'SUV',
      'Sedan',
      'Hatchback',
      'Truck',
      'Luxury',
      'Coupe',
      'Convertible',
      'Minivan',
      'Wagon',
      'Van',
      'Other',
    ],
    { errorMap: () => ({ message: 'Invalid vehicle body type' }) }
  ),
  manufacturingYear: z
    .number({ invalid_type_error: 'Manufacturing year must be a number' })
    .int('Manufacturing year must be an integer')
    .min(1900, 'Manufacturing year cannot be earlier than 1900')
    .max(currentYear + 1, `Manufacturing year cannot exceed ${currentYear + 1}`),
  registrationYear: z
    .number({ invalid_type_error: 'Registration year must be a number' })
    .int('Registration year must be an integer')
    .min(1900, 'Registration year cannot be earlier than 1900')
    .max(currentYear + 1, `Registration year cannot exceed ${currentYear + 1}`),
  registrationNumber: z.string().min(1, 'Registration number is required').trim(),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'], {
    errorMap: () => ({ message: 'Invalid fuel type' }),
  }),
  transmission: z.enum(['Manual', 'Automatic'], {
    errorMap: () => ({ message: 'Invalid transmission type' }),
  }),
  kmDriven: z
    .number({ invalid_type_error: 'Kilometres driven must be a number' })
    .min(0, 'Kilometres driven cannot be negative'),
  previousOwners: z
    .number({ invalid_type_error: 'Previous owners count must be a number' })
    .int()
    .min(0, 'Previous owners cannot be negative')
    .default(1),
  condition: z.enum(['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Work'], {
    errorMap: () => ({ message: 'Invalid vehicle condition' }),
  }),
  colour: z.string().min(1, 'Colour is required').trim(),
  seatingCapacity: z
    .number({ invalid_type_error: 'Seating capacity must be a number' })
    .int()
    .min(1, 'Seating capacity must be at least 1')
    .default(5),
  engineOrBattery: z.string().trim().optional(),
  location: z.object({
    country: z.string().trim().default('India'),
    state: z.string().min(1, 'State is required').trim(),
    city: z.string().min(1, 'City is required').trim(),
    area: z.string().trim().optional(),
    pincode: z.string().min(1, 'Pincode is required').trim(),
    pickupLocation: z.string().trim().optional(),
  }),
  features: z.array(z.string().trim()).optional().default([]),
  knownDefects: z.string().trim().optional(),
  serviceHistory: z.string().trim().optional(),
  accidentHistory: z.string().trim().optional(),
  insuranceInfo: z.string().trim().optional(),
  pollutionCertInfo: z.string().trim().optional(),
});

const createVehicleSchema = vehicleBaseSchema.refine(
  data => data.registrationYear >= data.manufacturingYear,
  {
    message: 'Registration year must be greater than or equal to manufacturing year',
    path: ['registrationYear'],
  }
);

const updateVehicleSchema = vehicleBaseSchema
  .partial()
  .refine(
    data => {
      if (data.registrationYear !== undefined && data.manufacturingYear !== undefined) {
        return data.registrationYear >= data.manufacturingYear;
      }
      return true;
    },
    {
      message: 'Registration year must be greater than or equal to manufacturing year',
      path: ['registrationYear'],
    }
  );

const reorderImagesSchema = z.object({
  imageIds: z
    .array(z.string().min(1, 'Image ID cannot be empty'))
    .min(1, 'At least one image ID must be provided'),
});

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
  reorderImagesSchema,
};
