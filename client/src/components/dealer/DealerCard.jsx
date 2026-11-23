import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, CheckCircle2, ChevronRight, Car } from 'lucide-react';
import { StatusChip } from '../ui/StatusChip';

/**
 * DealerCard per UI Section 7.10 & 8.8:
 * - 24px border radius, bg-surface, border border-border
 * - Dealership logo / initial avatar, dealership name, verified badge
 * - Location, listing count, description snippet, pill action button
 */
export function DealerCard({ dealer }) {
  const {
    id,
    _id,
    dealershipName,
    ownerName,
    city,
    logo,
    description,
    verificationStatus = 'approved',
    activeListingsCount = 0,
  } = dealer;

  const dealerId = id || _id;

  return (
    <div className="group relative flex flex-col justify-between p-6 rounded-[24px] bg-surface border border-border/70 hover:border-text/40 transition-all duration-200 select-none shadow-sm hover:shadow-md">
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Logo or Placeholder */}
          <div className="w-14 h-14 rounded-2xl bg-tile border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt={dealershipName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-6 h-6 text-muted" />
            )}
          </div>

          {/* Verification Chip */}
          <StatusChip
            status={verificationStatus}
            label={verificationStatus === 'approved' ? 'Verified Dealer' : verificationStatus}
          />
        </div>

        {/* Dealership Info */}
        <h3 className="text-[17px] font-semibold text-text tracking-tight group-hover:text-primary transition-colors line-clamp-1">
          {dealershipName}
        </h3>

        {ownerName && (
          <p className="text-[12px] text-muted mt-0.5">
            Managed by {ownerName}
          </p>
        )}

        {city && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted mt-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{city}</span>
          </div>
        )}

        {description && (
          <p className="text-[13px] text-muted/90 mt-3.5 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Bottom Section */}
      <div className="pt-5 mt-5 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-text">
          <Car className="w-4 h-4 text-muted" />
          <span>
            {activeListingsCount} {activeListingsCount === 1 ? 'vehicle' : 'vehicles'} listed
          </span>
        </div>

        <Link
          to={`/dealers/${dealerId}`}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-text group-hover:translate-x-0.5 transition-transform"
        >
          <span>View Showroom</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default DealerCard;
