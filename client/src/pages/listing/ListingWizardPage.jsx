import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Car,
  FileText,
  Camera,
  Tag,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { PhotoUploader } from '../../components/listing/PhotoUploader';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { useToast } from '../../context/ToastContext';
import { rupeesToPaise, paiseToRupees } from '../../utils/money';

const DRAFT_STORAGE_KEY = 'roam_listing_wizard_draft';

const STEPS = [
  { id: 1, title: 'Basics', icon: Car },
  { id: 2, title: 'Specs & Condition', icon: FileText },
  { id: 3, title: 'Photos', icon: Camera },
  { id: 4, title: 'Pricing & Type', icon: Tag },
  { id: 5, title: 'Review', icon: CheckCircle2 },
];

const BODY_TYPES = [
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
];

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'];
const TRANSMISSIONS = ['Manual', 'Automatic'];
const CONDITIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Work'];

const currentYear = new Date().getFullYear();

const initialFormData = {
  // Step 1: Basics
  brand: '',
  model: '',
  variant: '',
  bodyType: 'SUV',
  manufacturingYear: currentYear - 2,
  registrationYear: currentYear - 2,
  registrationNumber: '',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  colour: '',

  // Step 2: Specs & Condition
  kmDriven: 25000,
  previousOwners: 1,
  condition: 'Excellent',
  seatingCapacity: 5,
  engineOrBattery: '',
  country: 'India',
  state: '',
  city: '',
  area: '',
  pincode: '',
  pickupLocation: '',
  features: '',
  knownDefects: '',
  serviceHistory: '',
  accidentHistory: '',
  insuranceInfo: '',
  pollutionCertInfo: '',

  // Step 3: Photos
  images: [],

  // Step 4: Pricing & Listing Type
  purpose: 'sale', // 'sale' | 'rent' | 'both'
  saleAskingPrice: '', // Rupee input string
  saleNegotiable: false,
  saleMinOffer: '', // Rupee input string (private)
  saleDescription: '',
  saleConditions: '',

  // Rental (Spec 4.4)
  rentalDailyPrice: '',
  rentalWeeklyPrice: '',
  rentalSecurityDeposit: '',
  rentalMinDays: 1,
  rentalMaxDays: 30,
  rentalDriverIncluded: false,
  rentalMileageLimit: '',
  rentalFuelPolicy: '',
  rentalCancellationPolicy: '',
  rentalCancellationCutoffHours: 24,
  rentalConditions: '',
};

export function ListingWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);

  // Dynamic categories from settings API (Decision 1)
  const { data: dynamicCategories = BODY_TYPES } = useQuery({
    queryKey: ['settings-categories'],
    queryFn: async () => {
      const res = await fetch('/api/settings/categories');
      if (!res.ok) return BODY_TYPES;
      const json = await res.json();
      return json.data?.length > 0 ? json.data : BODY_TYPES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return { ...initialFormData, ...JSON.parse(saved), images: [] }; // Don't persist object URLs
      }
    } catch {}
    return initialFormData;
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autosave draft to localStorage
  useEffect(() => {
    try {
      const toSave = { ...formData, images: [] };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [formData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFormData(initialFormData);
    setCurrentStep(1);
    addToast({ title: 'Draft Cleared', message: 'Form reset to blank state.', type: 'info' });
  };

  const validateStep = step => {
    const errs = {};

    if (step === 1) {
      if (!formData.brand.trim()) errs.brand = 'Brand is required';
      if (!formData.model.trim()) errs.model = 'Model is required';
      if (!formData.registrationNumber.trim())
        errs.registrationNumber = 'Registration number is required';
      if (!formData.colour.trim()) errs.colour = 'Colour is required';

      const mYear = Number(formData.manufacturingYear);
      const rYear = Number(formData.registrationYear);
      if (!mYear || mYear < 1900 || mYear > currentYear + 1) {
        errs.manufacturingYear = `Must be between 1900 and ${currentYear + 1}`;
      }
      if (!rYear || rYear < mYear) {
        errs.registrationYear = 'Must be equal to or greater than manufacturing year';
      }
    } else if (step === 2) {
      if (Number(formData.kmDriven) < 0) errs.kmDriven = 'Cannot be negative';
      if (!formData.state.trim()) errs.state = 'State is required';
      if (!formData.city.trim()) errs.city = 'City is required';
      if (!formData.pincode.trim()) errs.pincode = 'Pincode is required';
    } else if (step === 3) {
      if (formData.images.length === 0) {
        errs.images = 'Please upload at least one photograph of the vehicle';
      }
    } else if (step === 4) {
      if (formData.purpose === 'sale' || formData.purpose === 'both') {
        const price = Number(formData.saleAskingPrice);
        if (!price || price <= 0) {
          errs.saleAskingPrice = 'Asking price must be a valid positive amount';
        }
        if (formData.saleMinOffer) {
          const minOffer = Number(formData.saleMinOffer);
          if (minOffer > price) {
            errs.saleMinOffer = 'Minimum offer cannot exceed asking price';
          }
        }
      }

      if (formData.purpose === 'rent' || formData.purpose === 'both') {
        const dailyPrice = Number(formData.rentalDailyPrice);
        if (!dailyPrice || dailyPrice <= 0) {
          errs.rentalDailyPrice = 'Daily rental price is required';
        }
      }
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

  const handleSubmit = async (saveAsDraft = false) => {
    if (!saveAsDraft && !validateStep(4)) {
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Vehicle
      const vehiclePayload = {
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        variant: formData.variant.trim(),
        bodyType: formData.bodyType,
        manufacturingYear: Number(formData.manufacturingYear),
        registrationYear: Number(formData.registrationYear),
        registrationNumber: formData.registrationNumber.trim(),
        fuelType: formData.fuelType,
        transmission: formData.transmission,
        kmDriven: Number(formData.kmDriven),
        previousOwners: Number(formData.previousOwners),
        condition: formData.condition,
        colour: formData.colour.trim(),
        seatingCapacity: Number(formData.seatingCapacity),
        engineOrBattery: formData.engineOrBattery.trim(),
        location: {
          country: formData.country || 'India',
          state: formData.state.trim(),
          city: formData.city.trim(),
          area: formData.area.trim(),
          pincode: formData.pincode.trim(),
          pickupLocation: formData.pickupLocation.trim(),
        },
        features: formData.features
          ? formData.features.split(',').map(f => f.trim()).filter(Boolean)
          : [],
        knownDefects: formData.knownDefects.trim(),
        serviceHistory: formData.serviceHistory.trim(),
        accidentHistory: formData.accidentHistory.trim(),
        insuranceInfo: formData.insuranceInfo.trim(),
        pollutionCertInfo: formData.pollutionCertInfo.trim(),
      };

      const vehRes = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vehiclePayload),
      });

      const vehData = await vehRes.json();
      if (!vehData.success) {
        throw new Error(vehData.error?.message || 'Failed to create vehicle');
      }
      const vehicleId = vehData.data.id;

      // 2. Upload vehicle images if any
      for (const img of formData.images) {
        if (img.file) {
          const form = new FormData();
          form.append('image', img.file);
          if (img.name) form.append('caption', img.name);

          const imgRes = await fetch(`/api/vehicles/${vehicleId}/images`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          });
          const imgData = await imgRes.json();
          if (img.isCover && imgData.success && imgData.data.images?.length > 0) {
            const uploadedImg = imgData.data.images[imgData.data.images.length - 1];
            await fetch(`/api/vehicles/${vehicleId}/images/${uploadedImg._id || uploadedImg.id}/cover`, {
              method: 'PATCH',
              credentials: 'include',
            });
          }
        }
      }

      // 3. Create Listing
      const listingPayload = {
        vehicleId,
        purpose: formData.purpose,
        saveAsDraft,
        sale: {
          enabled: formData.purpose === 'sale' || formData.purpose === 'both',
          askingPrice: formData.saleAskingPrice ? rupeesToPaise(formData.saleAskingPrice) : 0,
          negotiable: formData.saleNegotiable,
          minAcceptableOffer: formData.saleMinOffer
            ? rupeesToPaise(formData.saleMinOffer)
            : null,
          description: formData.saleDescription.trim(),
          conditions: formData.saleConditions.trim(),
        },
        rental: {
          dailyPrice: formData.rentalDailyPrice ? rupeesToPaise(formData.rentalDailyPrice) : 0,
          weeklyPrice: formData.rentalWeeklyPrice
            ? rupeesToPaise(formData.rentalWeeklyPrice)
            : 0,
          securityDeposit: formData.rentalSecurityDeposit
            ? rupeesToPaise(formData.rentalSecurityDeposit)
            : 0,
          minDays: Number(formData.rentalMinDays) || 1,
          maxDays: Number(formData.rentalMaxDays) || 30,
          driverIncluded: formData.rentalDriverIncluded,
          mileageLimit: formData.rentalMileageLimit.trim(),
          fuelPolicy: formData.rentalFuelPolicy.trim(),
          cancellationPolicy: formData.rentalCancellationPolicy.trim(),
          cancellationCutoffHours: Number(formData.rentalCancellationCutoffHours) || 24,
          conditions: formData.rentalConditions.trim(),
        },
      };

      const listRes = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(listingPayload),
      });

      const listData = await listRes.json();
      if (!listData.success) {
        throw new Error(listData.error?.message || 'Failed to create listing');
      }

      // Clear draft on success
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      queryClient.invalidateQueries(['myListings']);
      queryClient.invalidateQueries(['myVehicles']);

      addToast({
        title: saveAsDraft ? 'Draft Saved' : 'Listing Published',
        message: saveAsDraft
          ? 'Your listing has been saved as a draft.'
          : 'Your vehicle has been successfully submitted and listed.',
        type: 'success',
      });

      navigate('/dashboard/listings');
    } catch (err) {
      addToast({
        title: 'Error Creating Listing',
        message: err.message,
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview vehicle object
  const previewVehicle = {
    brand: formData.brand || 'Brand',
    model: formData.model || 'Model',
    variant: formData.variant,
    fuelType: formData.fuelType,
    transmission: formData.transmission,
    kmDriven: Number(formData.kmDriven) || 0,
    images: formData.images,
    ownerRef: { type: 'user' },
  };

  const previewListing = {
    purpose: formData.purpose,
    sale: {
      status: 'active',
      askingPrice: formData.saleAskingPrice ? rupeesToPaise(formData.saleAskingPrice) : 0,
      negotiable: formData.saleNegotiable,
    },
    rental: {
      dailyPrice: formData.rentalDailyPrice ? rupeesToPaise(formData.rentalDailyPrice) : 0,
    },
  };

  return (
    <div className="min-h-screen bg-bg-subtle text-text pb-24">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-border bg-surface px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-light tracking-tight text-text">
              Create Vehicle Listing
            </h1>
            <p className="text-[12px] text-muted">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title} · Autosaved to browser
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearDraft}
              className="text-[11px] h-8 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="text-[11px] h-8 px-3"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Stepper Navigation (Numbered 1-2-3-4-5 connected by thin lines) */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8">
        <div className="flex items-center justify-between relative mb-8">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border -z-0" />
          {STEPS.map(step => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`relative z-10 flex flex-col items-center gap-1.5 focus:outline-none`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-medium transition-all ${
                    isCompleted
                      ? 'bg-text text-bg border-2 border-text'
                      : isCurrent
                      ? 'bg-surface text-text border-2 border-text ring-4 ring-text/10'
                      : 'bg-surface text-muted border-2 border-border'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                </div>
                <span
                  className={`text-[11px] hidden sm:block ${
                    isCurrent ? 'font-semibold text-text' : 'text-muted'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form Steps + Pinned Live Preview Card */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Area (7 cols on large) */}
        <div className="lg:col-span-8 bg-surface rounded-[24px] border border-border p-6 md:p-8 shadow-sm">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-medium text-text mb-1">Vehicle Basics</h3>
                <p className="text-[12px] text-muted">
                  Provide the core make, model, year, and registration details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Brand / Make *"
                  placeholder="e.g. Toyota, Honda, Hyundai"
                  value={formData.brand}
                  onChange={e => handleChange('brand', e.target.value)}
                  error={errors.brand}
                />
                <Input
                  label="Model *"
                  placeholder="e.g. City, Innova, Creta"
                  value={formData.model}
                  onChange={e => handleChange('model', e.target.value)}
                  error={errors.model}
                />
                <Input
                  label="Variant"
                  placeholder="e.g. ZX, VXI, Dual-Tone"
                  value={formData.variant}
                  onChange={e => handleChange('variant', e.target.value)}
                />
                <Select
                  label="Body Type *"
                  options={dynamicCategories.map(t => ({ value: t, label: t }))}
                  value={formData.bodyType}
                  onChange={val => handleChange('bodyType', val)}
                />
                <Input
                  label="Manufacturing Year *"
                  type="number"
                  min="1900"
                  max={currentYear + 1}
                  value={formData.manufacturingYear}
                  onChange={e => handleChange('manufacturingYear', e.target.value)}
                  error={errors.manufacturingYear}
                />
                <Input
                  label="Registration Year *"
                  type="number"
                  min="1900"
                  max={currentYear + 1}
                  value={formData.registrationYear}
                  onChange={e => handleChange('registrationYear', e.target.value)}
                  error={errors.registrationYear}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Registration Number * (Kept private from public)"
                    placeholder="e.g. MH 02 CL 1234"
                    value={formData.registrationNumber}
                    onChange={e => handleChange('registrationNumber', e.target.value)}
                    error={errors.registrationNumber}
                  />
                  <span className="text-[10px] text-muted block mt-1">
                    Your vehicle registration number is stored securely and never visible to public marketplace browsers.
                  </span>
                </div>
                <Select
                  label="Fuel Type *"
                  options={FUEL_TYPES.map(f => ({ value: f, label: f }))}
                  value={formData.fuelType}
                  onChange={val => handleChange('fuelType', val)}
                />
                <Select
                  label="Transmission *"
                  options={TRANSMISSIONS.map(t => ({ value: t, label: t }))}
                  value={formData.transmission}
                  onChange={val => handleChange('transmission', val)}
                />
                <Input
                  label="Colour *"
                  placeholder="e.g. Pearl White, Modern Steel"
                  value={formData.colour}
                  onChange={e => handleChange('colour', e.target.value)}
                  error={errors.colour}
                />
              </div>
            </div>
          )}

          {/* STEP 2: SPECS & CONDITION */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-medium text-text mb-1">Specifications & Location</h3>
                <p className="text-[12px] text-muted">
                  Accurate condition and location information builds buyer trust.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Kilometres Driven *"
                  type="number"
                  min="0"
                  value={formData.kmDriven}
                  onChange={e => handleChange('kmDriven', e.target.value)}
                  error={errors.kmDriven}
                />
                <Input
                  label="Previous Owners *"
                  type="number"
                  min="0"
                  value={formData.previousOwners}
                  onChange={e => handleChange('previousOwners', e.target.value)}
                />
                <Select
                  label="Overall Condition *"
                  options={CONDITIONS.map(c => ({ value: c, label: c }))}
                  value={formData.condition}
                  onChange={val => handleChange('condition', val)}
                />
                <Input
                  label="Seating Capacity *"
                  type="number"
                  min="1"
                  value={formData.seatingCapacity}
                  onChange={e => handleChange('seatingCapacity', e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Engine or Battery Details"
                    placeholder="e.g. 1.5L i-VTEC, 40 kWh Lithium-ion Battery"
                    value={formData.engineOrBattery}
                    onChange={e => handleChange('engineOrBattery', e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-[14px] font-medium text-text mb-3">Location Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="State *"
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={e => handleChange('state', e.target.value)}
                    error={errors.state}
                  />
                  <Input
                    label="City *"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={e => handleChange('city', e.target.value)}
                    error={errors.city}
                  />
                  <Input
                    label="Area / Locality"
                    placeholder="e.g. Andheri West"
                    value={formData.area}
                    onChange={e => handleChange('area', e.target.value)}
                  />
                  <Input
                    label="Pincode *"
                    placeholder="e.g. 400053"
                    value={formData.pincode}
                    onChange={e => handleChange('pincode', e.target.value)}
                    error={errors.pincode}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Pickup / Inspection Address"
                      placeholder="e.g. Landmark, metro station or specific street"
                      value={formData.pickupLocation}
                      onChange={e => handleChange('pickupLocation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-[14px] font-medium text-text mb-3">Features & History</h4>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Key Features (Comma-separated)"
                    placeholder="e.g. Sunroof, Leather Seats, Android Auto, Cruise Control"
                    value={formData.features}
                    onChange={e => handleChange('features', e.target.value)}
                  />
                  <Textarea
                    label="Known Defects or Scratches"
                    placeholder="Mention any dents, minor scratches or mechanical points honestly."
                    value={formData.knownDefects}
                    onChange={e => handleChange('knownDefects', e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Service History"
                      placeholder="e.g. Authorised dealer serviced up to 30k km"
                      value={formData.serviceHistory}
                      onChange={e => handleChange('serviceHistory', e.target.value)}
                    />
                    <Input
                      label="Accident History"
                      placeholder="e.g. Clean history, no major accidents"
                      value={formData.accidentHistory}
                      onChange={e => handleChange('accidentHistory', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PHOTOS */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-medium text-text mb-1">Vehicle Photographs</h3>
                <p className="text-[12px] text-muted">
                  Upload crisp photos of your car. The photo marked with the solid left-line indicator is shown as the primary cover photo.
                </p>
              </div>

              <PhotoUploader
                images={formData.images}
                onImagesChange={updated => handleChange('images', updated)}
                error={errors.images}
              />
            </div>
          )}

          {/* STEP 4: PRICING & LISTING TYPE */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-medium text-text mb-1">Listing Type & Pricing</h3>
                <p className="text-[12px] text-muted">
                  Choose how you want to offer this vehicle.
                </p>
              </div>

              {/* Purpose Selector Tiles */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'sale', label: 'For Sale', desc: 'Direct purchase offers' },
                  { id: 'rent', label: 'For Rent', desc: 'Self-drive rental bookings' },
                  { id: 'both', label: 'Sale & Rent', desc: 'Both purchase and rental' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChange('purpose', p.id)}
                    className={`p-4 rounded-[16px] text-left border transition-all ${
                      formData.purpose === p.id
                        ? 'border-text bg-tile shadow-sm ring-1 ring-text/20'
                        : 'border-border hover:border-border/80 bg-surface'
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-text">{p.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* Conditional Sale Pricing */}
              {(formData.purpose === 'sale' || formData.purpose === 'both') && (
                <div className="border border-border rounded-[16px] p-5 bg-tile/30 flex flex-col gap-4">
                  <h4 className="text-[14px] font-semibold text-text">Sale Terms & Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Asking Price (₹) *"
                      type="number"
                      placeholder="e.g. 950000"
                      value={formData.saleAskingPrice}
                      onChange={e => handleChange('saleAskingPrice', e.target.value)}
                      error={errors.saleAskingPrice}
                    />
                    <Input
                      label="Minimum Acceptable Offer (₹) - Private"
                      type="number"
                      placeholder="e.g. 900000 (Owner eyes only)"
                      value={formData.saleMinOffer}
                      onChange={e => handleChange('saleMinOffer', e.target.value)}
                      error={errors.saleMinOffer}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saleNegotiable"
                      checked={formData.saleNegotiable}
                      onChange={e => handleChange('saleNegotiable', e.target.checked)}
                      className="rounded border-border text-primary focus:ring-text"
                    />
                    <label htmlFor="saleNegotiable" className="text-[12px] text-text select-none cursor-pointer">
                      Price is negotiable
                    </label>
                  </div>

                  <Textarea
                    label="Sale Description"
                    placeholder="Tell buyers why your car stands out..."
                    value={formData.saleDescription}
                    onChange={e => handleChange('saleDescription', e.target.value)}
                  />
                </div>
              )}

              {/* Conditional Rental Pricing (Spec 4.4) */}
              {(formData.purpose === 'rent' || formData.purpose === 'both') && (
                <div className="border border-border rounded-[16px] p-5 bg-tile/30 flex flex-col gap-4">
                  <h4 className="text-[14px] font-semibold text-text">Rental Terms & Rates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Daily Rental Rate (₹) *"
                      type="number"
                      placeholder="e.g. 2500"
                      value={formData.rentalDailyPrice}
                      onChange={e => handleChange('rentalDailyPrice', e.target.value)}
                      error={errors.rentalDailyPrice}
                    />
                    <Input
                      label="Weekly Rental Rate (₹)"
                      type="number"
                      placeholder="e.g. 15000"
                      value={formData.rentalWeeklyPrice}
                      onChange={e => handleChange('rentalWeeklyPrice', e.target.value)}
                    />
                    <Input
                      label="Security Deposit (₹)"
                      type="number"
                      placeholder="e.g. 10000"
                      value={formData.rentalSecurityDeposit}
                      onChange={e => handleChange('rentalSecurityDeposit', e.target.value)}
                    />
                    <Input
                      label="Min Duration (Days)"
                      type="number"
                      min="1"
                      value={formData.rentalMinDays}
                      onChange={e => handleChange('rentalMinDays', e.target.value)}
                    />
                    <Input
                      label="Cancellation Cutoff (Hours)"
                      type="number"
                      min="0"
                      placeholder="e.g. 24"
                      value={formData.rentalCancellationCutoffHours}
                      onChange={e => handleChange('rentalCancellationCutoffHours', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rentalDriverIncluded"
                      checked={formData.rentalDriverIncluded}
                      onChange={e => handleChange('rentalDriverIncluded', e.target.checked)}
                      className="rounded border-border text-primary focus:ring-text"
                    />
                    <label htmlFor="rentalDriverIncluded" className="text-[12px] text-text select-none cursor-pointer">
                      Professional driver included
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {currentStep === 5 && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-medium text-text mb-1">Review & Publish</h3>
                <p className="text-[12px] text-muted">
                  Double check your vehicle details before submitting.
                </p>
              </div>

              {/* Dotted Leader Spec Summary Rows */}
              <div className="border border-border rounded-[16px] p-5 bg-surface flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-muted mb-2">
                  Summary Specifications
                </span>

                {[
                  { label: 'Vehicle', value: `${formData.brand} ${formData.model} ${formData.variant}` },
                  { label: 'Body Type', value: formData.bodyType },
                  { label: 'Year', value: `${formData.manufacturingYear} (Reg: ${formData.registrationYear})` },
                  { label: 'Mileage / Fuel', value: `${Number(formData.kmDriven).toLocaleString()} km · ${formData.fuelType} · ${formData.transmission}` },
                  { label: 'Condition', value: formData.condition },
                  { label: 'Location', value: `${formData.city}, ${formData.state} (${formData.pincode})` },
                  { label: 'Listing Purpose', value: formData.purpose === 'both' ? 'Sale & Rent' : formData.purpose === 'rent' ? 'For Rent' : 'For Sale' },
                  ...(formData.saleAskingPrice ? [{ label: 'Asking Price', value: `₹${Number(formData.saleAskingPrice).toLocaleString('en-IN')}` }] : []),
                  ...(formData.saleMinOffer ? [{ label: 'Private Min Offer', value: `₹${Number(formData.saleMinOffer).toLocaleString('en-IN')} (Private)` }] : []),
                  ...(formData.rentalDailyPrice ? [{ label: 'Rental Rate', value: `₹${Number(formData.rentalDailyPrice).toLocaleString('en-IN')} / day` }] : []),
                ].map((row, i) => (
                  <div key={i} className="flex items-baseline justify-between text-[12px] py-1 border-b border-border/40 last:border-b-0">
                    <span className="text-muted font-normal">{row.label}</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-border/80" />
                    <span className="font-medium text-text text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-[16px] bg-tile/40 border border-border text-[12px] text-muted flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-text shrink-0 mt-0.5" />
                <span>
                  By publishing, you confirm all provided details are accurate. Once published, your listing will be immediately available in the public catalog.
                </span>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-border mt-8 pt-6">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleBack}
                disabled={isSubmitting}
                className="text-[12px]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                className="text-[12px]"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="text-[12px]"
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  loading={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="text-[12px]"
                >
                  Publish Listing
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Pinned Live Preview Card (4 cols on large) */}
        <div className="lg:col-span-4 sticky top-6 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Live Marketplace Preview
            </span>
            <span className="text-[10px] text-muted">Pinned</span>
          </div>

          <div className="bg-surface rounded-[24px] border border-border p-4 shadow-sm flex justify-center">
            <VehicleCard
              vehicle={previewVehicle}
              listing={previewListing}
              showStatus={false}
              className="w-full"
            />
          </div>

          <p className="text-[10px] text-muted px-2 text-center">
            This preview simulates how your vehicle tile appears to buyers across browse and carousel views.
          </p>
        </div>
      </div>
    </div>
  );
}
