import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

export function DealerVerificationStatusPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('Trade License');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Fetch Dealer profile for the current user
  const {
    data: dealer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-dealer-profile'],
    queryFn: async () => {
      const res = await fetch('/api/dealers/me');
      if (!res.ok) throw new Error('No dealership profile found');
      const json = await res.json();
      return json.data;
    },
  });

  const dealerId = dealer?.id || dealer?._id;
  const status = dealer?.verificationStatus || 'pending';

  // Upload additional/revised document mutation
  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!docFile || !dealerId) return;
      const formData = new FormData();
      formData.append('document', docFile);
      formData.append('docType', docType);

      const res = await fetch(`/api/dealers/${dealerId}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Document upload failed');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-dealer-profile']);
      setDocFile(null);
      addToast('Document uploaded successfully', 'success');
    },
    onError: err => {
      addToast(err.message || 'Failed to upload document', 'error');
    },
  });

  const handleUploadSubmit = e => {
    e.preventDefault();
    if (!docFile) {
      addToast('Please select a file to upload', 'error');
      return;
    }
    uploadDocMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header activeNav="Dealers" />
        <main className="flex-1 max-w-[800px] mx-auto w-full px-4 sm:px-8 py-12">
          <Skeleton className="w-1/3 h-8 mb-4" />
          <Skeleton className="w-full h-48 rounded-[24px] mb-8" />
          <Skeleton className="w-full h-64 rounded-[24px]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !dealer) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <Header activeNav="Dealers" />
        <main className="flex-1 max-w-[800px] mx-auto w-full px-4 sm:px-8 py-16 flex items-center justify-center">
          <EmptyState
            icon={Building2}
            title="No Dealership Registered"
            description="You have not registered a dealership yet. Apply today to become a certified marketplace partner."
            actionLabel="Register Dealership"
            onAction={() => window.location.assign('/dealer/register')}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const statusConfigs = {
    pending: {
      badgeText: 'Under Review',
      title: 'Verification In Progress',
      color: 'amber',
      icon: Clock,
      message:
        'Your dealership registration and supporting documents are currently being reviewed by our compliance team. Verification typically takes 24–48 business hours.',
    },
    approved: {
      badgeText: 'Verified Partner',
      title: 'Dealership Verified & Active',
      color: 'emerald',
      icon: CheckCircle2,
      message:
        'Congratulations! Your dealership has been verified. You can now publish vehicles, browse the owner acquisition feed, and upload inventory via CSV.',
    },
    changes_requested: {
      badgeText: 'Changes Requested',
      title: 'Additional Information Required',
      color: 'amber',
      icon: AlertTriangle,
      message:
        'Our compliance team requires additional information or clearer documentation before approving your dealership.',
    },
    rejected: {
      badgeText: 'Application Rejected',
      title: 'Registration Rejected',
      color: 'red',
      icon: XCircle,
      message:
        'Your dealership application could not be verified with the provided information.',
    },
    suspended: {
      badgeText: 'Operations Suspended',
      title: 'Dealership Suspended',
      color: 'red',
      icon: XCircle,
      message:
        'Your dealership account has been temporarily suspended due to a compliance or policy review. Contact support for assistance.',
    },
  };

  const currentConfig = statusConfigs[status] || statusConfigs.pending;
  const StatusIcon = currentConfig.icon;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header activeNav="Dealers" />

      <main className="flex-1 max-w-[800px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16">
        {/* Dealership Mini Header */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-border/60">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-tile border border-border flex items-center justify-center shrink-0 overflow-hidden">
              {dealer.logo ? (
                <img
                  src={dealer.logo}
                  alt={dealer.dealershipName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7 text-muted" />
              )}
            </div>
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-text tracking-tight">
                {dealer.dealershipName}
              </h1>
              <p className="text-[12px] text-muted">
                {dealer.city} · {dealer.businessEmail}
              </p>
            </div>
          </div>

          {status === 'approved' && (
            <Link to={`/dealers/${dealerId}`}>
              <Button variant="secondary" size="sm" className="rounded-full text-[12px]">
                <span>Public Showroom</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Status Alert Banner */}
        <div
          className={`p-6 sm:p-8 rounded-[28px] border shadow-sm mb-8 ${
            status === 'approved'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
              : status === 'changes_requested' || status === 'pending'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100'
              : 'bg-red-500/10 border-red-500/20 text-red-950 dark:text-red-100'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                status === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : status === 'changes_requested' || status === 'pending'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
              }`}
            >
              <StatusIcon className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[18px] font-semibold tracking-tight">
                  {currentConfig.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-surface/80 text-text border border-border/50">
                  {currentConfig.badgeText}
                </span>
              </div>

              <p className="text-[13px] sm:text-[14px] opacity-90 leading-relaxed mt-1">
                {currentConfig.message}
              </p>

              {/* Admin Verification Notes if present */}
              {dealer.verificationNotes && (
                <div className="mt-4 p-4 rounded-xl bg-surface/90 border border-border/50 text-text">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    Compliance Officer Notes:
                  </p>
                  <p className="text-[13px] leading-relaxed">
                    &ldquo;{dealer.verificationNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Quick Actions for Approved status */}
              {status === 'approved' && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to="/listing/new">
                    <Button variant="primary" size="md" className="rounded-full">
                      <span>Publish New Listing</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  <Link to="/dealers">
                    <Button variant="secondary" size="md" className="rounded-full">
                      <span>Browse Dealer Directory</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-surface border border-border shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-text tracking-tight">
                Verification Documents
              </h3>
              <p className="text-[12px] text-muted">
                Official business registration and license proofs on file.
              </p>
            </div>
            <span className="text-[11px] text-muted">
              {dealer.documents?.length || 0} uploaded
            </span>
          </div>

          {dealer.documents && dealer.documents.length > 0 ? (
            <div className="divide-y divide-border/60">
              {dealer.documents.map((doc, idx) => (
                <div
                  key={doc.id || doc._id || idx}
                  className="py-3 flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-text">
                        {doc.docType || 'Verification Document'}
                      </p>
                      <p className="text-[11px] text-muted">
                        Uploaded on {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {dealerId && (
                    <a
                      href={`/api/dealers/${dealerId}/documents/${doc.id || doc._id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-medium text-primary hover:underline"
                    >
                      View / Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted italic py-2">
              No documents currently uploaded.
            </p>
          )}

          {/* Upload New / Additional Document Form */}
          {(status === 'pending' || status === 'changes_requested') && (
            <form onSubmit={handleUploadSubmit} className="mt-6 pt-6 border-t border-border/60">
              <h4 className="text-[13px] font-semibold text-text mb-3">
                Upload Additional or Updated Document
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
                    Select File (PDF, PNG, JPG)
                  </label>
                  <label className="flex items-center justify-between h-10 px-3 rounded-xl bg-surface border border-border cursor-pointer hover:bg-tile transition-colors">
                    <span className="text-[12px] text-text truncate max-w-[160px]">
                      {docFile ? docFile.name : 'Choose file...'}
                    </span>
                    <Upload className="w-3.5 h-3.5 text-muted shrink-0" />
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg"
                      onChange={e => setDocFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={uploadDocMutation.isPending || !docFile}
                  className="rounded-full"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>{uploadDocMutation.isPending ? 'Uploading...' : 'Submit Document'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default DealerVerificationStatusPage;
