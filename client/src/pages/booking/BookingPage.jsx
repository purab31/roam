import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  User,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatRupees } from '../../utils/money';

const STEPS = [
  { id: 1, title: 'Dates & Location' },
  { id: 2, title: 'Driver Details' },
  { id: 3, title: 'Review & Request' },
];

export function BookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const initialStart = searchParams.get('start')
    ? new Date(searchParams.get('start')).toISOString().split('T')[0]
    : '';
  const initialEnd = searchParams.get('end')
    ? new Date(searchParams.get('end')).toISOString().split('T')[0]
    : '';

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    startDate: initialStart,
    endDate: initialEnd,
    pickupLocation: '',
    returnLocation: '',
    driverName: user?.fullName || '',
    driverEmail: user?.email || '',
    driverMobile: user?.mobile || '',
    licenseNumber: '',
    notes: '',
    agreeTerms: false,
  });

  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch Listing
  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing-booking', id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${id}`);
      const json = await res.json();
      return json.success ? json.data : null;
    },
    enabled: !!id,
  });

  const vehicle = listing?.vehicleRef;
  const rental = listing?.rental || {};

  const dailyPrice = rental.dailyPrice || 0;
  const weeklyPrice = rental.weeklyPrice || 0;
  const deposit = rental.securityDeposit || 0;
  const minDays = rental.minDays || 1;
  const maxDays = rental.maxDays || 30;

  // Set default locations when listing loads
  React.useEffect(() => {
    if (listing && !formData.pickupLocation) {
      setFormData(prev => ({
        ...prev,
        pickupLocation: rental.pickupLocation || vehicle?.location?.city || '',
        returnLocation: rental.returnLocation || rental.pickupLocation || vehicle?.location?.city || '',
      }));
    }
  }, [listing]);

  // Pricing calculation
  const pricing = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    let baseRate = days * dailyPrice;
    let strategy = 'daily';

    if (weeklyPrice > 0) {
      const fullWeeks = Math.floor(days / 7);
      const remDays = days % 7;
      const weeklyPlusDaily = fullWeeks * weeklyPrice + remDays * dailyPrice;
      const ceilWeeks = Math.ceil(days / 7) * weeklyPrice;

      if (weeklyPlusDaily < baseRate) {
        baseRate = weeklyPlusDaily;
        strategy = 'weekly_plus_daily';
      }
      if (ceilWeeks < baseRate) {
        baseRate = ceilWeeks;
        strategy = 'round_up_weeks';
      }
    }

    const estimatedTotal = baseRate + deposit;

    return {
      days,
      baseRate,
      deposit,
      estimatedTotal,
      strategy,
      isBelowMin: days < minDays,
      isAboveMax: days > maxDays,
    };
  }, [formData.startDate, formData.endDate, dailyPrice, weeklyPrice, deposit, minDays, maxDays]);

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = step => {
    const errs = {};
    if (step === 1) {
      if (!formData.startDate) errs.startDate = 'Pickup date is required';
      if (!formData.endDate) errs.endDate = 'Return date is required';
      if (formData.startDate && formData.endDate) {
        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
          errs.endDate = 'Return date must be strictly after pickup date';
        }
      }
      if (pricing?.isBelowMin) errs.startDate = `Minimum duration is ${minDays} days`;
      if (pricing?.isAboveMax) errs.endDate = `Maximum duration is ${maxDays} days`;
    }
    if (step === 2) {
      if (!formData.driverName?.trim()) errs.driverName = 'Driver full name is required';
      if (!formData.driverMobile?.trim()) errs.driverMobile = 'Mobile number is required';
      if (!formData.licenseNumber?.trim()) errs.licenseNumber = 'Driving license number is required';
    }
    if (step === 3) {
      if (!formData.agreeTerms) errs.agreeTerms = 'You must accept the rental conditions';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Booking Request Mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listingId: id,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          notes: `Driver: ${formData.driverName} (License: ${formData.licenseNumber}, Mobile: ${formData.driverMobile}). Notes: ${formData.notes || 'None'}`,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to submit booking request');
      }
      return json.data.booking;
    },
    onSuccess: data => {
      setConfirmedBooking(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: err => {
      showToast({
        type: 'danger',
        message: err.message || 'Booking submission failed',
      });
    },
  });

  const handleSubmit = () => {
    if (validateStep(3)) {
      bookingMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <Header activeNav="Rent" />
        <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 py-12">
          <Skeleton className="w-48 h-4 rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="lg:col-span-2 h-[400px] rounded-[24px]" />
            <Skeleton className="h-[400px] rounded-[24px]" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Confirmation Screen (UI 8.6)
  if (confirmedBooking) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <Header activeNav="Rent" />
        <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 py-16 flex flex-col items-center text-center">
          {/* Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-warning/15 text-warning border border-warning/30 text-[11px] font-semibold uppercase tracking-wider mb-6">
            <Clock className="w-3.5 h-3.5" />
            <span>Booking Requested · Awaiting Owner Confirmation</span>
          </div>

          {/* 56px / 300 Heading */}
          <h1 className="text-[40px] sm:text-[56px] font-light leading-[1.05] tracking-[-0.03em] text-text mb-4 max-w-2xl">
            Your rental request has been sent.
          </h1>

          <p className="text-[14px] text-muted max-w-lg mb-10 leading-relaxed">
            The owner has been notified and will review your requested dates. Once confirmed, you will receive a notification and booking status update.
          </p>

          {/* Details Card */}
          <div className="w-full max-w-lg rounded-[24px] bg-surface border border-border p-6 shadow-sm text-left flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-[12px] text-muted">Vehicle</span>
              <span className="text-[13px] font-medium text-text">
                {vehicle?.brand} {vehicle?.model} {vehicle?.variant}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-[12px] text-muted">Duration</span>
              <span className="text-[13px] font-medium text-text">
                {confirmedBooking.pricing?.days} Days ({new Date(confirmedBooking.startDate).toLocaleDateString()} – {new Date(confirmedBooking.endDate).toLocaleDateString()})
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-[12px] text-muted">Estimated Total</span>
              <span className="text-[15px] font-semibold text-text">
                {formatRupees(confirmedBooking.pricing?.estimatedTotal)}
              </span>
            </div>

            <div className="text-[11px] text-muted">
              Includes {formatRupees(confirmedBooking.pricing?.deposit)} refundable security deposit. Payment and handover occur directly upon vehicle pickup.
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-4">
            <Button variant="primary" onClick={() => navigate('/dashboard/bookings')}>
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => navigate('/browse?purpose=rent')}>
              Browse More Rentals
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const vehicleTitle = `${vehicle?.manufacturingYear} ${vehicle?.brand} ${vehicle?.model} ${vehicle?.variant}`;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Header activeNav="Rent" />

      <main className="grow max-w-container mx-auto w-full px-4 sm:px-8 lg:px-16 py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-[11px] text-muted">
          <ol className="flex items-center gap-2">
            <li><Link to="/" className="hover:text-text">Home</Link></li>
            <li><ChevronRight className="w-3 h-3 text-text-faint" /></li>
            <li><Link to="/browse?purpose=rent" className="hover:text-text">Rent</Link></li>
            <li><ChevronRight className="w-3 h-3 text-text-faint" /></li>
            <li><Link to={`/listings/${id}`} className="hover:text-text">{vehicle?.model}</Link></li>
            <li><ChevronRight className="w-3 h-3 text-text-faint" /></li>
            <li className="text-text font-medium">Rental Booking</li>
          </ol>
        </nav>

        {/* Stepper Header (UI 8.6) */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-10">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full text-[12px] font-medium flex items-center justify-center transition-all ${
                    currentStep === step.id
                      ? 'bg-primary text-on-primary ring-2 ring-primary/20'
                      : currentStep > step.id
                      ? 'bg-text-faint/30 text-text'
                      : 'border border-border text-muted'
                  }`}
                >
                  {step.id}
                </span>
                <span
                  className={`text-[12px] font-medium hidden sm:inline ${
                    currentStep === step.id ? 'text-text' : 'text-muted'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="w-8 sm:w-16 h-[1px] bg-border" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Content Grid: 8 cols Form + 4 cols Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Area */}
          <div className="lg:col-span-8 bg-surface rounded-[24px] border border-border p-6 sm:p-8 shadow-sm">
            {/* STEP 1: DATES & LOCATION */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[20px] font-light text-text mb-1">Rental Dates & Handover</h2>
                  <p className="text-[12px] text-muted">
                    Select your pickup and return schedule. Minimum duration for this vehicle is {minDays} {minDays === 1 ? 'day' : 'days'}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Pickup Date *"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.startDate}
                    onChange={e => handleChange('startDate', e.target.value)}
                    error={errors.startDate}
                  />
                  <Input
                    label="Return Date *"
                    type="date"
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    value={formData.endDate}
                    onChange={e => handleChange('endDate', e.target.value)}
                    error={errors.endDate}
                  />
                  <Input
                    label="Pickup Location"
                    value={formData.pickupLocation}
                    onChange={e => handleChange('pickupLocation', e.target.value)}
                    placeholder="e.g. Owner address / landmark"
                  />
                  <Input
                    label="Return Location"
                    value={formData.returnLocation}
                    onChange={e => handleChange('returnLocation', e.target.value)}
                    placeholder="e.g. Same as pickup"
                  />
                </div>

                {/* Driver Option Information */}
                <div className="p-4 rounded-[16px] bg-tile/40 border border-border flex items-start gap-3 text-[12px]">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-text">
                      {rental.driverIncluded ? 'Chauffeur / Driver Included' : 'Self-Drive Vehicle'}
                    </span>
                    <span className="text-muted">
                      {rental.driverIncluded
                        ? 'A professional verified driver is assigned with this vehicle.'
                        : 'You are renting this vehicle for self-drive. A valid driving license is required.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DRIVER DETAILS */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[20px] font-light text-text mb-1">Renter & Driver Information</h2>
                  <p className="text-[12px] text-muted">
                    Enter the primary driver’s details for legal handover and verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Legal Name *"
                    placeholder="As shown on driver's license"
                    value={formData.driverName}
                    onChange={e => handleChange('driverName', e.target.value)}
                    error={errors.driverName}
                  />
                  <Input
                    label="Contact Phone / Mobile *"
                    placeholder="+91..."
                    value={formData.driverMobile}
                    onChange={e => handleChange('driverMobile', e.target.value)}
                    error={errors.driverMobile}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.driverEmail}
                    onChange={e => handleChange('driverEmail', e.target.value)}
                  />
                  <Input
                    label="Driving License Number *"
                    placeholder="e.g. MH02 20180012345"
                    value={formData.licenseNumber}
                    onChange={e => handleChange('licenseNumber', e.target.value)}
                    error={errors.licenseNumber}
                  />
                </div>

                <Input
                  label="Trip Notes / Special Requests (Optional)"
                  placeholder="e.g. Arriving from flight at 10 AM, need child seat..."
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                />
              </div>
            )}

            {/* STEP 3: REVIEW & REQUEST */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[20px] font-light text-text mb-1">Review Booking Request</h2>
                  <p className="text-[12px] text-muted">
                    Please review all rental terms before submitting your request to the vehicle owner.
                  </p>
                </div>

                {/* Summary Dotted-Leader Table */}
                <div className="p-5 rounded-[16px] bg-tile/30 border border-border flex flex-col divide-y divide-border/40 text-[12px]">
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Vehicle</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-medium text-text">{vehicleTitle}</span>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Pickup Schedule</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-medium text-text">{new Date(formData.startDate).toDateString()}</span>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Return Schedule</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-medium text-text">{new Date(formData.endDate).toDateString()}</span>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Handover Location</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-medium text-text">{formData.pickupLocation}</span>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Driver</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-medium text-text">{formData.driverName} ({formData.licenseNumber})</span>
                  </div>
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-muted">Total Estimated Amount</span>
                    <span className="flex-1 mx-3 border-b border-dotted border-border" />
                    <span className="font-semibold text-text">{formatRupees(pricing?.estimatedTotal || 0)}</span>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={e => handleChange('agreeTerms', e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-text"
                  />
                  <label htmlFor="agreeTerms" className="text-[12px] text-text select-none cursor-pointer">
                    I agree to the vehicle rental conditions, fuel policy, and acknowledge that a refundable security deposit of {formatRupees(deposit)} is payable at handover.
                  </label>
                </div>
                {errors.agreeTerms && (
                  <span className="text-[11px] text-danger -mt-4">{errors.agreeTerms}</span>
                )}
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-border mt-8 pt-6">
              {currentStep > 1 ? (
                <Button variant="outline" size="md" onClick={handleBack} className="text-[12px]">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <Button variant="primary" size="md" onClick={handleNext} className="text-[12px]">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  loading={bookingMutation.isPending}
                  onClick={handleSubmit}
                  className="text-[12px]"
                >
                  Submit Booking Request
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Floating Summary Card (UI 8.6) */}
          <div className="lg:col-span-4 sticky top-24 bg-surface rounded-[24px] border border-border p-6 shadow-card flex flex-col gap-5">
            {/* Vehicle Mini Tile */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              {vehicle?.images?.[0]?.url ? (
                <img
                  src={vehicle.images[0].url}
                  alt=""
                  className="w-16 h-14 rounded-[12px] object-cover bg-tile border border-border/50 shrink-0"
                />
              ) : (
                <div className="w-16 h-14 rounded-[12px] bg-tile flex items-center justify-center text-muted shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-text truncate">
                  {vehicleTitle}
                </span>
                <span className="text-[11px] text-muted">
                  {vehicle?.fuelType} · {vehicle?.transmission}
                </span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="flex flex-col gap-2.5 text-[12px]">
              <div className="flex items-center justify-between text-muted">
                <span>Daily Rate</span>
                <span className="font-medium text-text">{formatRupees(dailyPrice)} / day</span>
              </div>

              {pricing ? (
                <>
                  <div className="flex items-center justify-between text-muted">
                    <span>Duration</span>
                    <span className="font-medium text-text">{pricing.days} Days</span>
                  </div>

                  <div className="flex items-center justify-between text-muted">
                    <span>Rental Charge</span>
                    <span className="font-medium text-text">{formatRupees(pricing.baseRate)}</span>
                  </div>

                  {deposit > 0 && (
                    <div className="flex items-center justify-between text-muted">
                      <span className="flex items-center gap-1">
                        Security Deposit
                        <Shield className="w-3 h-3 text-muted" />
                      </span>
                      <span className="font-medium text-text">{formatRupees(deposit)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3 mt-1 flex items-center justify-between text-[15px] font-semibold text-text">
                    <span>Estimated Total</span>
                    <span>{formatRupees(pricing.estimatedTotal)}</span>
                  </div>
                  <span className="text-[10px] text-muted text-right">
                    (Refundable deposit of {formatRupees(deposit)} shown separately)
                  </span>
                </>
              ) : (
                <div className="py-4 text-center text-muted text-[11px]">
                  Select dates to see total calculation.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
