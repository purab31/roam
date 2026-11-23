import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { DottedSpecRow } from '../components/discovery/DottedSpecRow';
import { Carousel } from '../components/discovery/Carousel';
import { VehicleCard } from '../components/vehicle/VehicleCard';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { OfferSideSheet } from '../components/offer/OfferSideSheet';
import { EnquiryModal } from '../components/enquiry/EnquiryModal';
import { DateRangePicker } from '../components/rental/DateRangePicker';
import { RentalTermsTab } from '../components/rental/RentalTermsTab';
import { ReportModal } from '../components/report/ReportModal';
import { formatRupees } from '../utils/money';
import {
  ChevronRight,
  Heart,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  User as UserIcon,
  Maximize2,
  Car,
  Calendar,
  MapPin,
  Clock,
  Mail,
  Phone,
  Flag,
} from 'lucide-react';

async function fetchListingDetail(id) {
  const res = await fetch(`/api/listings/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error('Failed to load listing');
  }
  const json = await res.json();
  return json.data;
}

/**
 * UI 8.3 & UI 7.3 - 7.13 Vehicle Detail Page:
 * - Breadcrumb (7.3).
 * - Hero gallery (7.4) with vertical thumbnail rail and 2px left-line active indicator.
 * - Floating buy card (7.5) with price, description teaser, info rows, and auth-routed CTAs.
 * - Narrow 720px column with Tabs (7.6), Dotted-leader Spec table (7.7), Numbered features (7.8).
 * - Similar vehicles carousel (7.9 - 7.11).
 * - Under 768px sticky bottom bar.
 */
export function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('specifications');
  const [isSaved, setIsSaved] = useState(false);
  const [isOfferSheetOpen, setIsOfferSheetOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('buy'); // 'buy' | 'rent'
  const [rentalDateRange, setRentalDateRange] = useState({ start: '', end: '' });

  const { data: listing, isLoading, isError, error } = useQuery({
    queryKey: ['listing-detail', id],
    queryFn: () => fetchListingDetail(id),
    retry: 1,
  });

  // Sync initial mode with listing purpose
  React.useEffect(() => {
    if (listing?.purpose === 'rent') {
      setActiveMode('rent');
    } else {
      setActiveMode('buy');
    }
  }, [listing?.purpose]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <Header activeNav="Buy" />
        <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-12">
          <Skeleton className="w-48 h-4 rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="lg:col-span-2 h-[480px] rounded-[24px]" />
            <Skeleton className="h-[480px] rounded-[24px]" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <Header activeNav="Buy" />
        <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 py-24 text-center flex flex-col items-center justify-center">
          <Car className="w-16 h-16 text-muted mb-4 stroke-[1.2]" />
          <h2 className="text-[28px] font-light text-text mb-2">Listing not available</h2>
          <p className="text-[13px] text-muted max-w-md mb-6">
            This vehicle may have been sold, removed, or is currently pending review.
          </p>
          <Button variant="primary" onClick={() => navigate('/browse')}>
            Explore Marketplace
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const vehicle = listing.vehicleRef || {};
  const seller = listing.seller;
  const similarListings = listing.similarListings || [];

  const isOwner =
    isAuthenticated &&
    user &&
    listing.ownerRef &&
    (listing.ownerRef.id === user.id ||
      listing.ownerRef.id === user._id ||
      (user.dealerId && listing.ownerRef.id === user.dealerId));

  const isReserved = listing.sale?.status === 'reserved';
  const isRent = listing.purpose === 'rent';
  const hasRental = listing.purpose === 'rent' || listing.purpose === 'both';

  const images = vehicle.images?.length > 0
    ? vehicle.images
    : [{ url: '/uploads/images/placeholders/placeholder-suv.svg', isCover: true, caption: 'Default vehicle' }];

  const currentImage = images[activeImageIndex] || images[0];

  // Title formatting: e.g. "2021 Honda City ZX"
  const fullTitle = `${vehicle.manufacturingYear || ''} ${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim();

  // Price formatting
  const priceDisplay = listing.sale?.askingPrice
    ? formatRupees(listing.sale.askingPrice)
    : listing.rental?.dailyPrice
    ? `${formatRupees(listing.rental.dailyPrice)} / day`
    : 'Price on request';

  // Handle action buttons per Sprint 4 (Adjustment 12)
  const handleOfferClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/listings/${id}`);
      return;
    }
    if (isRent) {
      showToast('Rental bookings unlock in Sprint 6.', 'info');
      return;
    }
    setIsOfferSheetOpen(true);
  };

  const handleEnquiryClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/listings/${id}`);
      return;
    }
    setIsEnquiryModalOpen(true);
  };

  const handleReportClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/listings/${id}`);
      return;
    }
    setIsReportModalOpen(true);
  };

  const scrollToDescription = () => {
    setActiveTab('specifications');
    document.getElementById('description-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-200 flex flex-col">
      <Header activeNav="Buy" />

      <main className="grow">
        {/* 7.3 Breadcrumb */}
        <nav
          aria-label="Breadcrumbs"
          className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 pt-6 pb-4"
        >
          <ol className="flex items-center gap-1.5 text-[11px] text-muted select-none flex-wrap">
            <li>
              <Link to="/" className="hover:text-text transition-colors">
                Home
              </Link>
            </li>
            <ChevronRight className="w-3 h-3 text-text-faint shrink-0" />
            <li>
              <Link to="/browse" className="hover:text-text transition-colors">
                Marketplace
              </Link>
            </li>
            <ChevronRight className="w-3 h-3 text-text-faint shrink-0" />
            {vehicle.bodyType && (
              <>
                <li>
                  <Link
                    to={`/browse?bodyType=${vehicle.bodyType}`}
                    className="hover:text-text transition-colors"
                  >
                    {vehicle.bodyType}
                  </Link>
                </li>
                <ChevronRight className="w-3 h-3 text-text-faint shrink-0" />
              </>
            )}
            <li className="text-text font-medium truncate max-w-[200px] sm:max-w-none">
              {fullTitle}
            </li>
          </ol>
        </nav>

        {/* 7.4 Hero Gallery (Left) & 7.5 Floating Buy Card (Right) */}
        <section className="relative w-full bg-bg-subtle border-y border-border/40 py-8 lg:py-12">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12">
            {/* Gallery Left */}
            <div className="w-full lg:max-w-[720px] flex flex-col-reverse sm:flex-row gap-4 items-start">
              {/* Thumbnail Rail with 2px Vertical Black Line for Active State (UI 7.4) */}
              <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-visible w-full sm:w-auto pb-2 sm:pb-0">
                {images.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <div key={idx} className="relative flex items-center">
                      {/* 2px Solid Left-line Active Indicator on Desktop */}
                      {isActive && (
                        <div
                          className="hidden sm:block absolute -left-2.5 top-1 bottom-1 w-[2px] bg-primary rounded-full transition-all"
                          aria-hidden="true"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`View photo ${idx + 1}`}
                        className={`relative w-12 h-12 rounded-[12px] bg-tile overflow-hidden border border-border/50 cursor-pointer transition-opacity ${
                          isActive ? 'opacity-100 ring-1 ring-text' : 'opacity-60 hover:opacity-90'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Main Image Display */}
              <div className="relative w-full h-[320px] sm:h-[480px] rounded-[24px] bg-tile overflow-hidden flex items-center justify-center p-4 border border-border/40 shadow-xs">
                <img
                  src={currentImage.url}
                  alt={fullTitle}
                  className="w-full h-full object-cover rounded-[16px] transition-transform duration-300"
                />

                {/* Status Badge Top-Left if Reserved */}
                {isReserved && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                    Reserved
                  </div>
                )}
              </div>
            </div>

            {/* 7.5 Floating Buy Card (Right) */}
            <aside
              aria-label="Vehicle purchase actions"
              className="w-full lg:max-w-[340px] shrink-0 rounded-[24px] bg-surface text-text border border-border p-6 shadow-card flex flex-col gap-5 sticky top-24 select-none"
            >
              {/* UI 7.5: Two-segment pill switch Buy | Rent when purpose is 'both' */}
              {listing.purpose === 'both' ? (
                <div className="flex p-1 rounded-full bg-tile border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveMode('buy')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-full transition-all cursor-pointer ${
                      activeMode === 'buy'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('rent')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-full transition-all cursor-pointer ${
                      activeMode === 'rent'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    Rent
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="uppercase font-semibold tracking-wider">
                    {listing.purpose === 'rent' ? 'For Rent' : 'For Sale'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-tile text-text font-medium capitalize">
                    {seller?.sellerType || 'Individual'}
                  </span>
                </div>
              )}

              {/* Title: 32px / 300 font-light */}
              <h1 className="text-[28px] sm:text-[32px] font-light leading-[1.1] tracking-[-0.02em] text-text line-clamp-2">
                {fullTitle}
              </h1>

              {/* Price Row (dynamically switches based on activeMode) */}
              <div className="flex flex-col gap-0.5 pb-2 border-b border-border/60">
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-medium tracking-tight text-text">
                    {activeMode === 'rent' || listing.purpose === 'rent'
                      ? `${formatRupees(listing.rental?.dailyPrice || 0)} / day`
                      : formatRupees(listing.sale?.askingPrice || 0)}
                  </span>
                  {activeMode === 'buy' && listing.sale?.negotiable && (
                    <span className="text-[11px] text-muted font-normal">
                      (Negotiable)
                    </span>
                  )}
                </div>
                {(activeMode === 'rent' || listing.purpose === 'rent') && listing.rental?.securityDeposit > 0 && (
                  <span className="text-[11px] text-muted">
                    Refundable deposit: {formatRupees(listing.rental.securityDeposit)}
                  </span>
                )}
              </div>

              {/* Description Teaser with MORE link */}
              {listing.sale?.description && (
                <div className="text-[12px] text-muted line-clamp-3 leading-relaxed">
                  {listing.sale.description}{' '}
                  <button
                    type="button"
                    onClick={scrollToDescription}
                    className="font-bold text-text uppercase text-[10px] tracking-wider underline hover:text-accent cursor-pointer ml-1"
                  >
                    MORE
                  </button>
                </div>
              )}

              {/* Info Rows with Icons */}
              <div className="flex flex-col gap-2.5 py-2 border-y border-border/60 text-[11px] text-muted">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Full vehicle history and inspection verified</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Direct owner transaction without middlemen</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Transparent paperwork & ownership transfer</span>
                </div>
              </div>

              {/* Primary Action Section */}
              {!isOwner && !isReserved ? (
                activeMode === 'rent' || listing.purpose === 'rent' ? (
                  /* Rent Mode: Date Range Picker & Request Booking */
                  <DateRangePicker
                    listing={listing}
                    startDate={rentalDateRange.start}
                    endDate={rentalDateRange.end}
                    onDateChange={range => setRentalDateRange(range)}
                  />
                ) : (
                  /* Buy Mode: Make an Offer / Send Enquiry */
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleOfferClick}
                        className="grow h-11 text-[13px]"
                      >
                        Make an offer
                      </Button>
                      <button
                        type="button"
                        onClick={() => setIsSaved(prev => !prev)}
                        aria-label="Save to wishlist"
                        className={`flex items-center justify-center w-11 h-11 rounded-full border border-border text-muted hover:text-danger hover:border-danger transition-colors cursor-pointer shrink-0 ${
                          isSaved ? 'text-danger border-danger fill-danger' : ''
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleEnquiryClick}
                      className="w-full h-9 text-[12px]"
                    >
                      Send enquiry
                    </Button>

                    {!isOwner && (
                      <div className="pt-2 border-t border-border/40 flex justify-center">
                        <button
                          type="button"
                          onClick={handleReportClick}
                          className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-danger transition-colors cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report listing</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : isReserved ? (
                <div className="p-3 rounded-[16px] bg-tile text-center text-[12px] text-muted">
                  This listing is currently reserved by another buyer.
                </div>
              ) : (
                <div className="p-3 rounded-[16px] bg-tile text-center text-[12px] text-muted">
                  This is your vehicle listing. You can manage it from your dashboard.
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* 7.6 Tabs & Narrow 720px Content Area */}
        <section className="max-w-[720px] mx-auto px-4 py-12">
          {/* Tab Row (UI 7.6) */}
          <div className="flex items-center border-b border-border/80 mb-8 select-none">
            <button
              type="button"
              onClick={() => setActiveTab('specifications')}
              className={`flex-1 py-3 text-[13px] font-medium text-center relative transition-colors cursor-pointer ${
                activeTab === 'specifications'
                  ? 'text-text font-semibold'
                  : 'text-text-faint hover:text-muted'
              }`}
            >
              Specifications
              {activeTab === 'specifications' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-text" />
              )}
            </button>

            {hasRental && (
              <button
                type="button"
                onClick={() => setActiveTab('rental')}
                className={`flex-1 py-3 text-[13px] font-medium text-center relative transition-colors cursor-pointer ${
                  activeTab === 'rental'
                    ? 'text-text font-semibold'
                    : 'text-text-faint hover:text-muted'
                }`}
              >
                Rental terms
                {activeTab === 'rental' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-text" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('seller')}
              className={`flex-1 py-3 text-[13px] font-medium text-center relative transition-colors cursor-pointer ${
                activeTab === 'seller'
                  ? 'text-text font-semibold'
                  : 'text-text-faint hover:text-muted'
              }`}
            >
              Seller
              {activeTab === 'seller' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-text" />
              )}
            </button>
          </div>

          {/* TAB 1: Specifications & Features */}
          {activeTab === 'specifications' && (
            <div className="flex flex-col gap-10 animate-fade-in">
              {/* 7.7 Dotted Leader Specification Table */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">
                  Vehicle Specifications
                </h3>
                <div className="flex flex-col">
                  <DottedSpecRow label="Make / Brand" value={vehicle.brand} />
                  <DottedSpecRow label="Model" value={vehicle.model} />
                  {vehicle.variant && <DottedSpecRow label="Variant" value={vehicle.variant} />}
                  <DottedSpecRow label="Manufacturing Year" value={vehicle.manufacturingYear} />
                  <DottedSpecRow label="Body Category" value={vehicle.bodyType} />
                  <DottedSpecRow
                    label="Kilometres Driven"
                    value={vehicle.kmDriven ? `${vehicle.kmDriven.toLocaleString('en-IN')} km` : '—'}
                  />
                  <DottedSpecRow label="Fuel Type" value={vehicle.fuelType} />
                  <DottedSpecRow label="Transmission" value={vehicle.transmission} />
                  <DottedSpecRow label="Condition" value={vehicle.condition} />
                  <DottedSpecRow label="Previous Owners" value={vehicle.previousOwners} />
                  <DottedSpecRow label="Exterior Colour" value={vehicle.colour} />
                  <DottedSpecRow label="Seating Capacity" value={`${vehicle.seatingCapacity || 5} Seats`} />
                  <DottedSpecRow
                    label="Registered Location"
                    value={`${vehicle.location?.city || ''}, ${vehicle.location?.state || ''}`}
                  />
                </div>
              </div>

              {/* 7.8 Description */}
              <div id="description-section" className="flex flex-col gap-2.5">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
                  Description
                </h3>
                <p className="text-[13px] text-muted leading-relaxed whitespace-pre-line">
                  {listing.sale?.description ||
                    'Vehicle in certified condition. Regular servicing completed at authorized centers.'}
                </p>
              </div>

              {/* 7.8 Numbered Features & Condition Groups */}
              <div className="flex flex-col gap-6">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
                  Features & Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Group 1: Equipment */}
                  <div className="flex flex-col gap-1.5 p-4 rounded-[16px] bg-tile border border-border/50">
                    <span className="text-[11px] font-semibold text-text">
                      1. Equipment & Technology
                    </span>
                    <ul className="text-[12px] text-muted flex flex-col gap-1 mt-1">
                      {vehicle.features?.length > 0 ? (
                        vehicle.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-text-faint">•</span>
                            <span>{feat}</span>
                          </li>
                        ))
                      ) : (
                        <li>Standard manufacturer equipment.</li>
                      )}
                    </ul>
                  </div>

                  {/* Group 2: Safety & History */}
                  <div className="flex flex-col gap-1.5 p-4 rounded-[16px] bg-tile border border-border/50">
                    <span className="text-[11px] font-semibold text-text">
                      2. Service & History
                    </span>
                    <div className="text-[12px] text-muted flex flex-col gap-1 mt-1">
                      <p>{vehicle.serviceHistory || 'Authorized service log maintained.'}</p>
                      <p>{vehicle.accidentHistory || 'Clean title. No structural damages.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rental Terms */}
          {activeTab === 'rental' && (
            <div className="animate-fade-in">
              <RentalTermsTab listing={listing} />
            </div>
          )}

          {/* TAB 3: Seller Profile */}
          {activeTab === 'seller' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="p-6 rounded-[24px] bg-tile border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-semibold text-[18px]">
                    {seller?.name ? seller.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-[16px] font-medium text-text">
                      {seller?.name || 'Roam Member'}
                    </h4>
                    <span className="text-[11px] text-muted capitalize">
                      {seller?.sellerType === 'dealer' ? 'Verified Dealer' : 'Private Individual Seller'}
                    </span>
                    {seller?.joinedAt && (
                      <span className="text-[10px] text-muted/80 mt-1">
                        Member since {new Date(seller.joinedAt).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact information if permitted by contactVisibility */}
                <div className="flex flex-col gap-2 text-[12px] text-muted">
                  {seller?.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-text" />
                      <span>{seller.email}</span>
                    </div>
                  ) : null}
                  {seller?.mobile ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-text" />
                      <span>{seller.mobile}</span>
                    </div>
                  ) : null}
                  {!seller?.email && !seller?.mobile && (
                    <span className="text-[11px] text-muted italic">
                      Direct contact visible upon negotiation in Sprint 4.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 7.9-7.11 Similar Vehicles Carousel */}
        {similarListings.length > 0 && (
          <section className="max-w-container mx-auto px-4 sm:px-8 lg:px-16 py-16 border-t border-border/40">
            <Carousel
              eyebrow="Marketplace Alternatives"
              title="Similar vehicles"
              description={`Other ${vehicle.bodyType || ''} models in a comparable price range.`}
              totalCount={similarListings.length}
              viewAllLink={`/browse?bodyType=${vehicle.bodyType || ''}`}
            >
              {similarListings.map(item => (
                <div key={item.id} className="shrink-0 w-[270px] snap-start">
                  <VehicleCard
                    vehicle={item.vehicleRef}
                    listing={item}
                  />
                </div>
              ))}
            </Carousel>
          </section>
        )}
      </main>

      {/* Mobile Sticky Bottom Bar (< 768px) per UI 7.5 */}
      <div className="md:hidden sticky bottom-0 z-40 w-full p-4 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-muted">Total Price</span>
          <span className="text-[16px] font-semibold text-text">{priceDisplay}</span>
        </div>

        {!isOwner && !isReserved && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOfferClick}
            className="px-6 h-10 text-[12px]"
          >
            {isRent ? 'Request booking' : 'Make an offer'}
          </Button>
        )}
      </div>

      {/* Offer Side Sheet (UI Section 8.3) */}
      <OfferSideSheet
        isOpen={isOfferSheetOpen}
        onClose={() => setIsOfferSheetOpen(false)}
        listing={listing}
      />

      {/* Enquiry Modal */}
      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        listing={listing}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        subjectType="listing"
        subjectRef={listing?._id || listing?.id || id}
        subjectTitle={fullTitle}
      />

      <Footer />
    </div>
  );
}

export default VehicleDetailPage;