const { z } = require('zod');
const Vehicle = require('../models/vehicle.model');
const Listing = require('../models/listing.model');
const { rupeesToPaise } = require('../utils/money');
const { ValidationError, ForbiddenError } = require('../errors');

const MAX_CSV_ROWS = 500;
const REQUIRED_HEADERS = [
  'brand',
  'model',
  'bodyType',
  'manufacturingYear',
  'registrationYear',
  'registrationNumber',
  'fuelType',
  'transmission',
  'kmDriven',
  'condition',
  'colour',
  'city',
  'state',
  'pincode',
  'askingPrice',
];

const rowSchema = z
  .object({
    brand: z.string().trim().min(1, 'Brand is required'),
    model: z.string().trim().min(1, 'Model is required'),
    variant: z.string().trim().optional().default(''),
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
      { errorMap: () => ({ message: 'Invalid bodyType' }) }
    ),
    manufacturingYear: z.coerce
      .number()
      .int()
      .min(1900, 'Invalid manufacturing year')
      .max(new Date().getFullYear() + 1, 'Manufacturing year cannot be in the future'),
    registrationYear: z.coerce.number().int().min(1900, 'Invalid registration year'),
    registrationNumber: z.string().trim().min(1, 'Registration number is required'),
    fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'], {
      errorMap: () => ({ message: 'Invalid fuelType' }),
    }),
    transmission: z.enum(['Manual', 'Automatic'], {
      errorMap: () => ({ message: 'Invalid transmission' }),
    }),
    kmDriven: z.coerce.number().min(0, 'Kilometres driven must be non-negative'),
    previousOwners: z.coerce.number().int().min(0).optional().default(1),
    condition: z.enum(['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Work'], {
      errorMap: () => ({ message: 'Invalid condition' }),
    }),
    colour: z.string().trim().min(1, 'Colour is required'),
    seatingCapacity: z.coerce.number().int().min(1).optional().default(5),
    city: z.string().trim().min(1, 'City is required'),
    state: z.string().trim().min(1, 'State is required'),
    pincode: z.string().trim().min(1, 'Pincode is required'),
    askingPrice: z.coerce.number().min(0, 'Asking price must be non-negative'),
    purpose: z.enum(['sale', 'rent', 'both']).optional().default('sale'),
    description: z.string().trim().optional().default(''),
  })
  .refine(data => data.registrationYear >= data.manufacturingYear, {
    message: 'Registration year cannot precede manufacturing year',
    path: ['registrationYear'],
  });

/**
 * Basic RFC 4180 compliant CSV parser.
 */
function parseCSV(text) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // ignore carriage return
      } else if (char === '\n') {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines.filter(line => line.some(field => field.length > 0));
}

class BulkUploadService {
  /**
   * Process a CSV file or CSV string for dealer inventory bulk upload.
   * Creates Vehicle and Listing records in 'draft' / 'inactive' status.
   */
  async processBulkUpload(user, csvString, options = {}) {
    const mode = options.mode === 'partial' ? 'partial' : 'atomic';

    if (!csvString || typeof csvString !== 'string' || !csvString.trim()) {
      throw new ValidationError('CSV content cannot be empty');
    }

    const rows = parseCSV(csvString.trim());
    if (rows.length < 2) {
      throw new ValidationError('CSV must contain a header row and at least one data row');
    }

    // Header validation (case-insensitive)
    const headerRow = rows[0].map(h => h.trim());
    const headerMap = {};
    headerRow.forEach((h, idx) => {
      headerMap[h.toLowerCase()] = idx;
    });

    const missingHeaders = REQUIRED_HEADERS.filter(
      reqHeader => headerMap[reqHeader.toLowerCase()] === undefined
    );

    if (missingHeaders.length > 0) {
      throw new ValidationError(
        `CSV missing required columns: [${missingHeaders.join(', ')}]`
      );
    }

    const dataRows = rows.slice(1);
    if (dataRows.length > MAX_CSV_ROWS) {
      throw new ValidationError(
        `CSV exceeds maximum limit of ${MAX_CSV_ROWS} rows. Found ${dataRows.length} rows.`
      );
    }

    const parsedRows = [];
    const errors = [];

    // Row-by-row parsing and Zod validation
    dataRows.forEach((row, index) => {
      const rowNum = index + 1; // 1-indexed data row
      const rawObject = {};

      headerRow.forEach((header, colIdx) => {
        const val = row[colIdx] !== undefined ? row[colIdx] : '';
        rawObject[header] = val;
      });

      const parsed = rowSchema.safeParse(rawObject);
      if (!parsed.success) {
        parsed.error.errors.forEach(err => {
          errors.push({
            row: rowNum,
            field: err.path.join('.'),
            message: err.message,
            value: rawObject[err.path[0]],
          });
        });
      } else {
        parsedRows.push({ rowNum, data: parsed.data });
      }
    });

    // Atomic mode: if any error, abort without saving anything
    if (mode === 'atomic' && errors.length > 0) {
      return {
        success: false,
        mode: 'atomic',
        totalRows: dataRows.length,
        createdCount: 0,
        errors,
        createdItems: [],
      };
    }

    // Rows to save (in partial mode, only valid parsedRows; in atomic, all must have passed)
    const rowsToCreate = mode === 'atomic' ? parsedRows : parsedRows;
    const createdItems = [];

    for (const item of rowsToCreate) {
      const rowData = item.data;

      // Create Vehicle
      const vehicle = await Vehicle.create({
        brand: rowData.brand,
        model: rowData.model,
        variant: rowData.variant || '',
        bodyType: rowData.bodyType,
        manufacturingYear: rowData.manufacturingYear,
        registrationYear: rowData.registrationYear,
        registrationNumber: rowData.registrationNumber,
        fuelType: rowData.fuelType,
        transmission: rowData.transmission,
        kmDriven: rowData.kmDriven,
        previousOwners: rowData.previousOwners,
        condition: rowData.condition,
        colour: rowData.colour,
        seatingCapacity: rowData.seatingCapacity,
        location: {
          city: rowData.city,
          state: rowData.state,
          pincode: rowData.pincode,
          country: 'India',
        },
        ownerRef: {
          type: 'dealer',
          id: user._id,
        },
        documents: [],
        images: [],
      });

      // Price: assuming user entered rupees in CSV, convert to paise
      const askingPricePaise =
        rowData.askingPrice > 100000000
          ? Math.round(rowData.askingPrice) // already paise
          : rupeesToPaise(rowData.askingPrice);

      // Create Listing in draft status per spec
      const listing = await Listing.create({
        vehicleRef: vehicle._id,
        ownerRef: {
          type: 'dealer',
          id: user._id,
        },
        purpose: rowData.purpose,
        moderationStatus: 'draft',
        sale: {
          enabled: rowData.purpose === 'sale' || rowData.purpose === 'both',
          status: 'inactive',
          askingPrice: askingPricePaise,
          negotiable: false,
          description: rowData.description || '',
        },
        rental: {
          status: 'inactive',
        },
        statusHistory: [
          {
            fromStatus: 'none',
            toStatus: 'draft',
            statusType: 'moderation',
            changedBy: user._id,
            changedAt: new Date(),
            reason: `Created via bulk CSV upload (Row ${item.rowNum})`,
          },
        ],
      });

      createdItems.push({
        row: item.rowNum,
        vehicleId: vehicle._id,
        listingId: listing._id,
        brand: vehicle.brand,
        model: vehicle.model,
      });
    }

    return {
      success: errors.length === 0 || mode === 'partial',
      mode,
      totalRows: dataRows.length,
      createdCount: createdItems.length,
      errors,
      createdItems,
    };
  }
}

module.exports = new BulkUploadService();
