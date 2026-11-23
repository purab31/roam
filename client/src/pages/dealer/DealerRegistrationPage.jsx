import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export function DealerRegistrationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dealershipName: '',
    ownerName: user?.fullName || '',
    businessEmail: user?.email || '',
    phone: user?.mobile || '',
    address: '',
    city: '',
    pincode: '',
    description: '',
    registrationInfo: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('Trade License');
  const [errors, setErrors] = useState({});

  // Check if current user already has a dealer profile
  const { data: existingDealer, isLoading: isCheckingDealer } = useQuery({
    queryKey: ['my-dealer-profile'],
    queryFn: async () => {
      const res = await fetch('/api/dealers/me');
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    retry: false,
  });

  // If already registered, navigate to verification status page
  useEffect(() => {
    if (existingDealer?.id || existingDealer?._id) {
      navigate('/dealer/verification', { replace: true });
    }
  }, [existingDealer, navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLogoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Logo image must be under 5MB', 'error');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDocChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('Document must be under 10MB', 'error');
      return;
    }
    setDocFile(file);
  };

  const validateStep = currentStep => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.dealershipName.trim()) errs.dealershipName = 'Dealership name is required';
      if (!formData.ownerName.trim()) errs.ownerName = 'Owner/manager name is required';
      if (!formData.businessEmail.trim()) {
        errs.businessEmail = 'Business email is required';
      } else if (!/^\S+@\S+\.\S+$/.test(formData.businessEmail)) {
        errs.businessEmail = 'Enter a valid email address';
      }
      if (!formData.phone.trim()) {
        errs.phone = 'Contact number is required';
      }
    } else if (currentStep === 2) {
      if (!formData.address.trim()) errs.address = 'Dealership address is required';
      if (!formData.city.trim()) errs.city = 'City is required';
      if (!formData.pincode.trim()) {
        errs.pincode = 'Pincode is required';
      } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
        errs.pincode = 'Pincode must be 6 digits';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit registration mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      // 1. Submit basic registration
      const res = await fetch('/api/dealers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Registration failed');
      }

      const dealer = json.data;
      const dealerId = dealer.id || dealer._id;

      // 2. Upload Logo if provided
      if (logoFile && dealerId) {
        const logoData = new FormData();
        logoData.append('logo', logoFile);
        await fetch(`/api/dealers/${dealerId}/logo`, {
          method: 'POST',
          credentials: 'include',
          body: logoData,
        });
      }

      // 3. Upload Document if provided
      if (docFile && dealerId) {
        const docData = new FormData();
        docData.append('document', docFile);
        docData.append('docType', docType);
        await fetch(`/api/dealers/${dealerId}/documents`, {
          method: 'POST',
          credentials: 'include',
          body: docData,
        });
      }

      return dealer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-dealer-profile']);
      queryClient.invalidateQueries(['authUser']);
      addToast('Dealership registered successfully! Your verification is pending.', 'success');
      navigate('/dealer/verification', { replace: true });
    },
    onError: err => {
      addToast(err.message || 'Failed to submit dealer registration', 'error');
    },
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (validateStep(1) && validateStep(2)) {
      registerMutation.mutate();
    }
  };

  const steps = [
    { num: 1, title: 'Basics', desc: 'Dealership & Contact' },
    { num: 2, title: 'Location', desc: 'Address & Showroom' },
    { num: 3, title: 'Documents', desc: 'Identity & Verification' },
  ];

  if (isCheckingDealer) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header activeNav="Dealers" />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Building2 className="w-10 h-10 text-muted mx-auto animate-pulse" />
            <p className="text-[13px] text-muted">Checking dealership status...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header activeNav="Dealers" />

      <main className="flex-1 max-w-[800px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tile border border-border text-[11px] font-medium text-muted mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Official Dealer Onboarding</span>
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-light tracking-tight text-text">
            Register Your Dealership
          </h1>
          <p className="text-[13px] sm:text-[14px] text-muted mt-2 leading-relaxed">
            Expand your pre-owned inventory, acquire vehicles directly from verified owners, and manage bulk catalog listings.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 select-none">
          {steps.map(s => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div
                key={s.num}
                className={`p-3 sm:p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-surface border-text/60 shadow-sm'
                    : isCompleted
                    ? 'bg-tile/70 border-border text-muted'
                    : 'bg-transparent border-border/40 text-muted/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-text text-bg'
                        : isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-medium text-text">
                    {s.title}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted truncate hidden sm:block">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-10 rounded-[28px] bg-surface border border-border shadow-sm">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[18px] font-semibold text-text tracking-tight mb-1">
                    Dealership & Contact Details
                  </h2>
                  <p className="text-[12px] text-muted">
                    Information that identifies your business on the marketplace.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <Input
                    label="Dealership / Business Name"
                    placeholder="e.g. Apex Motor Corp"
                    value={formData.dealershipName}
                    onChange={e => handleChange('dealershipName', e.target.value)}
                    error={errors.dealershipName}
                    required
                  />

                  <Input
                    label="Dealer / Owner Full Name"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.ownerName}
                    onChange={e => handleChange('ownerName', e.target.value)}
                    error={errors.ownerName}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Business Email"
                      type="email"
                      placeholder="contact@dealership.com"
                      value={formData.businessEmail}
                      onChange={e => handleChange('businessEmail', e.target.value)}
                      error={errors.businessEmail}
                      required
                    />

                    <Input
                      label="Primary Contact Phone"
                      placeholder="+919876543210"
                      value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      error={errors.phone}
                      required
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={nextStep}
                    className="rounded-full px-8"
                  >
                    <span>Next: Location</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Location & Address */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[18px] font-semibold text-text tracking-tight mb-1">
                    Showroom Location & Address
                  </h2>
                  <p className="text-[12px] text-muted">
                    Your physical showroom premises for vehicle inspections and handovers.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <Input
                    label="Physical Showroom Address"
                    placeholder="Plot / Unit number, Street, Commercial Landmark"
                    value={formData.address}
                    onChange={e => handleChange('address', e.target.value)}
                    error={errors.address}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={e => handleChange('city', e.target.value)}
                      error={errors.city}
                      required
                    />

                    <Input
                      label="Pincode (6 digits)"
                      placeholder="400053"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={e => handleChange('pincode', e.target.value)}
                      error={errors.pincode}
                      required
                    />
                  </div>

                  <Textarea
                    label="About Dealership (Optional)"
                    placeholder="Tell buyers and sellers about your experience, certifications, and vehicle specialities..."
                    rows={4}
                    value={formData.description}
                    onChange={e => handleChange('description', e.target.value)}
                  />
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={prevStep}
                    className="rounded-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={nextStep}
                    className="rounded-full px-8"
                  >
                    <span>Next: Documents</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Registration Info & Documents */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[18px] font-semibold text-text tracking-tight mb-1">
                    Verification Documents & Logo
                  </h2>
                  <p className="text-[12px] text-muted">
                    Upload official business credentials for administrator verification.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <Input
                    label="Business Registration / GSTIN / Trade License Number"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={formData.registrationInfo}
                    onChange={e => handleChange('registrationInfo', e.target.value)}
                  />

                  {/* Logo Upload Section */}
                  <div>
                    <label className="block text-[12px] font-medium text-text mb-2">
                      Dealership Logo (Optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-tile border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-7 h-7 text-muted" />
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-surface hover:bg-tile text-[12px] font-medium text-text transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Logo</span>
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="p-4 rounded-2xl bg-tile/50 border border-border/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-[13px] font-medium text-text">
                          Supporting Verification Document
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">PDF, PNG, JPG (Max 10MB)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Document Type
                        </label>
                        <select
                          value={docType}
                          onChange={e => setDocType(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-[12px] text-text focus:outline-none"
                        >
                          <option value="Trade License">Trade License</option>
                          <option value="GST Registration Certificate">GST Registration</option>
                          <option value="Shop & Establishment Act">Shop & Establishment</option>
                          <option value="Partnership Deed / Incorporation">Incorporation Certificate</option>
                          <option value="Other Official ID">Other Official ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Select File
                        </label>
                        <label className="flex items-center justify-between h-10 px-3 rounded-xl bg-surface border border-border cursor-pointer hover:bg-tile transition-colors">
                          <span className="text-[12px] text-text truncate max-w-[160px]">
                            {docFile ? docFile.name : 'Choose file...'}
                          </span>
                          <Upload className="w-3.5 h-3.5 text-muted shrink-0" />
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg"
                            onChange={handleDocChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Verification Note Notice */}
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[12px] leading-relaxed">
                      <p className="font-semibold">Review & Verification Policy</p>
                      <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Your application will be submitted for review. Once approved, you can publish inventory, access the owner acquisition feed, and upload CSV catalogs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={prevStep}
                    disabled={registerMutation.isPending}
                    className="rounded-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={registerMutation.isPending}
                    className="rounded-full px-8"
                  >
                    {registerMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default DealerRegistrationPage;
