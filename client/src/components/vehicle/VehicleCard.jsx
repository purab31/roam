import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Scale, Car } from 'lucide-react';
import { formatRupees } from '../../utils/money';
import { useFavourites } from '../../context/FavouritesContext';
import { useCompare } from '../../context/CompareContext';
import { VehicleImage } from './VehicleImage';

/**
 * UI 7.10 Vehicle Card (Carousel Tile & Grid Card)
 * - Tile: ~270px wide, image area 270x300, background --tile, radius 24px.
 * - Below tile: name 14px/500, price 11px muted, left aligned with 8px inset.
 * - Hover: image scales 1.04, circular heart button fades in at top-right.
 * - Extended metadata: "42,000 km · Petrol · Auto" in 10px muted.
 * - Small chips top-left on the tile: "For Sale", "For Rent", "Sale & Rent", "Dealer", "Private".
 */
export function VehicleCard({
  vehicle = {},
  listing = null,
  showStatus = true,
  onClick = null,
  className = '',
}) {
  const brand = vehicle.brand || 'Vehicle';
  const model = vehicle.model || 'Model';
  const variant = vehicle.variant ? ` ${vehicle.variant}` : '';
  const fullName = `${brand} ${model}${variant}`;

  // Find cover image or first image
  const coverImage =
    vehicle.images?.find(img => img.isCover)?.url ||
    vehicle.images?.[0]?.url ||
    null;

  // Determine purpose chip
  const purpose = listing?.purpose || 'sale';
  const purposeLabel =
    purpose === 'both' ? 'Sale & Rent' : purpose === 'rent' ? 'For Rent' : 'For Sale';

  // Determine seller type chip
  const sellerType =
    listing?.ownerRef?.type === 'dealer' || vehicle.ownerRef?.type === 'dealer'
      ? 'Dealer'
      : 'Private';

  // Format pricing
  let priceDisplay = 'Price on request';
  if (purpose === 'rent' && listing?.rental?.dailyPrice) {
    priceDisplay = `${formatRupees(listing.rental.dailyPrice)} / day`;
  } else if (purpose === 'both' && listing?.rental?.dailyPrice && listing?.sale?.askingPrice) {
    priceDisplay = `${formatRupees(listing.sale.askingPrice)} · ${formatRupees(listing.rental.dailyPrice)}/d`;
  } else if (listing?.sale?.askingPrice) {
    priceDisplay = formatRupees(listing.sale.askingPrice);
    if (listing.sale.negotiable) {
      priceDisplay += ' (Negotiable)';
    }
  } else if (listing?.rental?.dailyPrice) {
    priceDisplay = `${formatRupees(listing.rental.dailyPrice)} / day`;
  }

  // Metadata line
  const km = vehicle.kmDriven ? `${vehicle.kmDriven.toLocaleString('en-IN')} km` : null;
  const fuel = vehicle.fuelType || null;
  const transmission = vehicle.transmission || null;
  const metadataParts = [km, fuel, transmission].filter(Boolean);
  const metadataLine = metadataParts.join(' · ');

  const navigate = useNavigate();
  const { isFavourited, toggleFavourite } = useFavourites();
  const { isInCompare, addToCompare } = useCompare();

  const targetId = listing?.id || listing?._id || vehicle?.id || vehicle?._id;
  const favourited = isFavourited(targetId);
  const compared = isInCompare(targetId);

  const handleClick = e => {
    if (onClick) {
      onClick(e);
    } else {
      if (targetId) {
        navigate(`/listings/${targetId}`);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col w-full max-w-[280px] select-none cursor-pointer ${className}`}
    >
      {/* Tile Container: 270x300 image area, bg-tile, radius 24px */}
      <div className="relative w-full h-[300px] rounded-[24px] bg-tile overflow-hidden flex items-center justify-center p-4 transition-colors duration-300 group-hover:bg-tile/80">
        {/* Top-Left Chips */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 items-center">
          <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-surface/90 text-text backdrop-blur-sm shadow-sm border border-border/50">
            {purposeLabel}
          </span>
          <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-surface/80 text-muted backdrop-blur-sm border border-border/40">
            {sellerType}
          </span>
          {showStatus && listing?.sale?.status && listing.sale.status !== 'active' && (
            <span
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider ${
                listing.sale.status === 'reserved'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : listing.sale.status === 'sold'
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-muted/15 text-muted border border-border/50'
              }`}
            >
              {listing.sale.status}
            </span>
          )}
        </div>

        {/* Top-Right Action Buttons: Compare + Heart */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              addToCompare({
                id: targetId,
                title: fullName,
                price: priceDisplay,
                coverImage,
              });
            }}
            className={`w-8 h-8 rounded-full bg-surface/90 backdrop-blur-sm border border-border/50 flex items-center justify-center transition-all duration-200 shadow-sm ${
              compared
                ? 'opacity-100 text-accent border-accent/40 bg-accent/10'
                : 'opacity-0 group-hover:opacity-100 text-muted hover:text-text hover:scale-110'
            }`}
            title={compared ? 'In comparison tray' : 'Add to compare'}
            aria-label="Compare vehicle"
          >
            <Scale className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={e => toggleFavourite(targetId, e)}
            className={`w-8 h-8 rounded-full bg-surface/90 backdrop-blur-sm border border-border/50 flex items-center justify-center transition-all duration-200 shadow-sm ${
              favourited
                ? 'opacity-100 text-accent fill-accent'
                : 'opacity-0 group-hover:opacity-100 text-muted hover:text-accent hover:scale-110'
            }`}
            title={favourited ? 'Saved to favourites' : 'Save vehicle'}
            aria-label="Save vehicle"
          >
            <Heart className={`w-4 h-4 ${favourited ? 'fill-accent text-accent' : ''}`} />
          </button>
        </div>

        {/* Vehicle Image with 1.04 Hover Scale */}
        <VehicleImage
          src={coverImage}
          alt={fullName}
          bodyType={vehicle.bodyType}
          fuelType={vehicle.fuelType}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          lazy={true}
        />
      </div>

      {/* Below Tile: Name, Price, and Metadata (8px inset) */}
      <div className="px-2 pt-2.5 pb-1 flex flex-col gap-0.5">
        <h4 className="text-[14px] font-medium text-text leading-tight truncate tracking-tight">
          {fullName}
        </h4>
        <div className="text-[11px] font-normal text-muted tracking-tight">
          {priceDisplay}
        </div>
        {metadataLine && (
          <div className="text-[10px] text-muted/80 font-normal truncate mt-0.5">
            {metadataLine}
          </div>
        )}
      </div>
    </div>
  );
}
