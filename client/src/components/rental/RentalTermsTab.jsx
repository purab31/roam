import React from 'react';
import { formatRupees } from '../../utils/money';
import { AvailabilityCalendar } from './AvailabilityCalendar';

/**
 * UI Section 7.5 & 7.7: Rental Terms tab with dotted-leader rows
 */
export function RentalTermsTab({ listing }) {
  const rental = listing?.rental || {};

  const terms = [
    {
      label: 'Daily Rental Rate',
      value: rental.dailyPrice ? `${formatRupees(rental.dailyPrice)} / day` : 'Not specified',
    },
    ...(rental.weeklyPrice
      ? [
          {
            label: 'Weekly Rental Rate',
            value: `${formatRupees(rental.weeklyPrice)} / week`,
          },
        ]
      : []),
    {
      label: 'Security Deposit (Refundable)',
      value: rental.securityDeposit
        ? formatRupees(rental.securityDeposit)
        : 'Zero deposit',
    },
    {
      label: 'Minimum Rental Duration',
      value: `${rental.minDays || 1} ${(rental.minDays || 1) === 1 ? 'day' : 'days'}`,
    },
    {
      label: 'Maximum Rental Duration',
      value: `${rental.maxDays || 30} days`,
    },
    {
      label: 'Pickup Location',
      value: rental.pickupLocation || listing?.vehicleRef?.location?.city || 'Seller address',
    },
    {
      label: 'Return Location',
      value: rental.returnLocation || rental.pickupLocation || 'Same as pickup',
    },
    {
      label: 'Driver Policy',
      value: rental.driverIncluded ? 'Driver Included' : 'Self-drive (No driver)',
    },
    {
      label: 'Mileage Limit',
      value: rental.mileageLimit || 'Unlimited within city limits',
    },
    {
      label: 'Fuel Policy',
      value: rental.fuelPolicy || 'Same-to-same (Return with equal fuel)',
    },
    {
      label: 'Cancellation Policy',
      value: rental.cancellationPolicy || 'Free cancellation up to 24h prior to pickup',
    },
    ...(rental.conditions
      ? [
          {
            label: 'Special Rental Conditions',
            value: rental.conditions,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* Specifications Table (Dotted Leaders) */}
      <div className="flex flex-col">
        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted mb-4">
          Rental Terms & Pricing Details
        </h4>
        <div className="flex flex-col divide-y divide-border/40">
          {terms.map((item, index) => (
            <div
              key={index}
              className="flex items-baseline justify-between py-2.5 text-[12px] group"
            >
              <span className="text-muted font-normal shrink-0">{item.label}</span>
              <span className="flex-1 mx-3 border-b border-dotted border-border" />
              <span className="font-medium text-text text-right shrink-0 max-w-[50%]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Availability Calendar */}
      <div>
        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted mb-4">
          Availability Calendar
        </h4>
        <p className="text-[12px] text-muted mb-4">
          Check vehicle availability schedule. Blocked or confirmed dates cannot be reserved.
        </p>
        <AvailabilityCalendar listingId={listing._id || listing.id} />
      </div>
    </div>
  );
}
