const Listing = require('../models/listing.model');
const { isListingAvailable } = require('./listingAvailability.service');
const { ValidationError, NotFoundError } = require('../errors');
const { formatRupees } = require('../utils/money');

/**
 * Compare up to 3 listings side by side.
 * Returns public, available listings only.
 * If more than 3 IDs (or 0 IDs) are passed, throws ValidationError(400).
 */
async function compareListings(idsParam) {
  if (!idsParam) {
    throw new ValidationError('At least one listing ID is required for comparison');
  }

  const ids = Array.isArray(idsParam)
    ? idsParam
    : idsParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

  if (ids.length === 0) {
    throw new ValidationError('At least one listing ID is required for comparison');
  }

  if (ids.length > 3) {
    throw new ValidationError('Comparison is limited to a maximum of 3 vehicles');
  }

  const listings = await Listing.find({ _id: { $in: ids } }).populate({
    path: 'vehicleRef',
  });

  if (listings.length === 0) {
    throw new NotFoundError('None of the requested vehicles were found');
  }

  // Filter to available and public only
  const availableListings = [];
  for (const l of listings) {
    const isAvail = await isListingAvailable(l);
    if (isAvail) {
      availableListings.push(l);
    }
  }

  // Preserve order of incoming ids
  const orderedListings = ids
    .map(id => availableListings.find(l => l._id.toString() === id.toString()))
    .filter(Boolean);

  if (orderedListings.length === 0) {
    throw new NotFoundError('None of the selected vehicles are currently available for comparison');
  }

  // Vehicle tiles metadata
  const vehicles = orderedListings.map(l => {
    const v = l.vehicleRef;
    const coverImage =
      v?.images?.find(img => img.isCover)?.url ||
      v?.images?.[0]?.url ||
      '/placeholders/placeholder-suv.svg';

    let displayPrice = '';
    if (l.sale && l.sale.askingPrice) {
      displayPrice = formatRupees(l.sale.askingPrice);
    } else if (l.rental && l.rental.dailyPrice) {
      displayPrice = `${formatRupees(l.rental.dailyPrice)} / day`;
    }

    return {
      id: l._id.toString(),
      vehicleId: v?._id.toString(),
      title: `${v?.manufacturingYear || ''} ${v?.brand || ''} ${v?.model || ''} ${v?.variant || ''}`.trim(),
      brand: v?.brand || '',
      model: v?.model || '',
      variant: v?.variant || '',
      year: v?.manufacturingYear || null,
      price: displayPrice,
      rawPrice: l.sale?.askingPrice || l.rental?.dailyPrice || 0,
      purpose: l.purpose,
      coverImage,
      saleStatus: l.sale?.status,
      rentalStatus: l.rental?.status,
    };
  });

  // Specification definitions for comparison
  const specDefinitions = [
    { key: 'price', label: 'Price / Rate', getValue: l => {
      if (l.sale && l.sale.askingPrice) return formatRupees(l.sale.askingPrice);
      if (l.rental && l.rental.dailyPrice) return `${formatRupees(l.rental.dailyPrice)} / day`;
      return 'N/A';
    }},
    { key: 'brand', label: 'Brand', getValue: l => l.vehicleRef?.brand || '-' },
    { key: 'model', label: 'Model', getValue: l => l.vehicleRef?.model || '-' },
    { key: 'variant', label: 'Variant', getValue: l => l.vehicleRef?.variant || '-' },
    { key: 'year', label: 'Manufacturing Year', getValue: l => l.vehicleRef?.manufacturingYear?.toString() || '-' },
    { key: 'kmDriven', label: 'Kilometres Driven', getValue: l => l.vehicleRef?.kmDriven != null ? `${l.vehicleRef.kmDriven.toLocaleString('en-IN')} km` : '-' },
    { key: 'fuelType', label: 'Fuel Type', getValue: l => l.vehicleRef?.fuelType || '-' },
    { key: 'transmission', label: 'Transmission', getValue: l => l.vehicleRef?.transmission || '-' },
    { key: 'bodyType', label: 'Body Type', getValue: l => l.vehicleRef?.bodyType || '-' },
    { key: 'previousOwners', label: 'Ownership', getValue: l => l.vehicleRef?.previousOwners != null ? `${l.vehicleRef.previousOwners} owner${l.vehicleRef.previousOwners > 1 ? 's' : ''}` : '-' },
    { key: 'condition', label: 'Vehicle Condition', getValue: l => l.vehicleRef?.condition || '-' },
    { key: 'location', label: 'Location', getValue: l => {
      const loc = l.vehicleRef?.location;
      if (!loc) return '-';
      return [loc.area, loc.city].filter(Boolean).join(', ') || '-';
    }},
    { key: 'rentalDaily', label: 'Daily Rental Rate', getValue: l => l.rental?.dailyPrice ? `${formatRupees(l.rental.dailyPrice)} / day` : 'Not for rent' },
    { key: 'features', label: 'Key Features', getValue: l => {
      const feats = l.vehicleRef?.features || [];
      return feats.length > 0 ? feats.join(', ') : 'None listed';
    }},
  ];

  // Build aligned spec rows with difference marker
  const specs = specDefinitions.map(def => {
    const values = orderedListings.map(l => def.getValue(l));
    // Determine if values differ across columns
    const uniqueValues = new Set(values.map(v => (v || '').toLowerCase().trim()));
    const isDifferent = uniqueValues.size > 1;

    return {
      key: def.key,
      label: def.label,
      values,
      isDifferent,
    };
  });

  return {
    vehicles,
    specs,
    count: vehicles.length,
  };
}

module.exports = {
  compareListings,
};
