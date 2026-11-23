import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Tag,
  Megaphone,
  Check,
  X,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnnouncementBar } from '../../components/layout/AnnouncementBar';
import { useToast } from '../../context/ToastContext';

/**
 * Platform Settings Page per Spec 12 & Decision 1:
 * - Dealer verification requirement toggle
 * - Listing expiry days (1-365)
 * - Categories editor: add, rename, remove (unique, length limit, >= 1 category)
 * - Announcement bar editor: message1, message2, linkText, linkUrl with live preview
 * - Communicates with GET/PUT /api/admin/settings
 */
export function AdminSettingsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [dealerVerificationRequired, setDealerVerificationRequired] = useState(true);
  const [listingExpiryDays, setListingExpiryDays] = useState(90);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Announcement Bar state
  const [message1, setMessage1] = useState('');
  const [message2, setMessage2] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load platform settings');
      const json = await res.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settingsData) {
      setDealerVerificationRequired(!!settingsData.dealerVerificationRequired);
      setListingExpiryDays(Number(settingsData.listingExpiryDays) || 90);
      setCategories(Array.isArray(settingsData.categories) ? settingsData.categories : []);
      if (settingsData.announcementBar) {
        setMessage1(settingsData.announcementBar.message1 || '');
        setMessage2(settingsData.announcementBar.message2 || '');
        setLinkText(settingsData.announcementBar.linkText || '');
        setLinkUrl(settingsData.announcementBar.linkUrl || '');
      }
    }
  }, [settingsData]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async payload => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save settings');
      }
      return json.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries(['admin-settings']);
      queryClient.invalidateQueries(['settings-categories']);
      queryClient.invalidateQueries(['public-announcement']);
      addToast('Platform settings saved successfully', 'success');
      setFormError('');
    },
    onError: err => {
      setFormError(err.message || 'Saving settings failed');
      addToast(err.message || 'Saving settings failed', 'error');
    },
  });

  // --- Category Actions per Decision 1 ---
  const handleAddCategory = e => {
    e.preventDefault();
    setCategoryError('');
    const trimmed = newCategoryName.trim();

    if (!trimmed) {
      setCategoryError('Category name cannot be empty');
      return;
    }
    if (trimmed.length > 30) {
      setCategoryError('Category name cannot exceed 30 characters');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
      setCategoryError('Only letters, numbers, hyphens, and spaces allowed');
      return;
    }
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError(`Category "${trimmed}" already exists`);
      return;
    }

    setCategories(prev => [...prev, trimmed]);
    setNewCategoryName('');
  };

  const handleStartEdit = index => {
    setEditingIndex(index);
    setEditingName(categories[index]);
    setCategoryError('');
  };

  const handleSaveEdit = index => {
    setCategoryError('');
    const trimmed = editingName.trim();

    if (!trimmed) {
      setCategoryError('Category name cannot be empty');
      return;
    }
    if (trimmed.length > 30) {
      setCategoryError('Category name cannot exceed 30 characters');
      return;
    }
    if (
      categories.some(
        (c, idx) => idx !== index && c.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setCategoryError(`Category "${trimmed}" already exists`);
      return;
    }

    setCategories(prev => {
      const updated = [...prev];
      updated[index] = trimmed;
      return updated;
    });
    setEditingIndex(null);
    setEditingName('');
  };

  const handleRemoveCategory = index => {
    setCategoryError('');
    if (categories.length <= 1) {
      setCategoryError('Platform must have at least one vehicle category');
      return;
    }
    setCategories(prev => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  // --- Save Whole Settings Form ---
  const handleSaveSettings = e => {
    e.preventDefault();
    setFormError('');

    const expiryNum = Number(listingExpiryDays);
    if (isNaN(expiryNum) || expiryNum < 1 || expiryNum > 365) {
      setFormError('Listing expiry days must be an integer between 1 and 365');
      return;
    }

    if (!categories || categories.length === 0) {
      setFormError('At least one vehicle category must be configured');
      return;
    }

    const trimmedUrl = linkUrl.trim();
    if (
      trimmedUrl &&
      !trimmedUrl.startsWith('/') &&
      !trimmedUrl.startsWith('https://') &&
      !trimmedUrl.startsWith('http://')
    ) {
      setFormError('Announcement Link URL must start with / or https://');
      return;
    }

    saveMutation.mutate({
      dealerVerificationRequired,
      listingExpiryDays: expiryNum,
      categories,
      announcementBar: {
        message1: message1.trim(),
        message2: message2.trim(),
        linkText: linkText.trim(),
        linkUrl: trimmedUrl,
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 rounded-full" />
          <Skeleton className="h-44 w-full rounded-[24px]" />
          <Skeleton className="h-56 w-full rounded-[24px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSaveSettings} className="space-y-8 select-none">
        {/* Header with Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Platform Settings
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Configure dealer gate requirements, listing validity, vehicle categories, and the global announcement bar.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saveMutation.isPending}
            className="rounded-full text-[12px] px-6 self-start sm:self-auto shrink-0"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {formError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-[12px] flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Policies & Gate Rules */}
        <div className="p-6 rounded-[24px] bg-surface border border-border shadow-sm space-y-6">
          <h2 className="text-[16px] font-semibold text-text tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Marketplace Policies & Guards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Dealer Verification Toggle */}
            <div className="p-4 rounded-2xl bg-tile border border-border/70 flex items-start justify-between gap-4">
              <div>
                <span className="font-semibold text-text text-[13px] block">
                  Mandatory Dealer Verification
                </span>
                <p className="text-[11px] text-muted mt-0.5 leading-normal">
                  When enabled, registered dealers cannot publish vehicle listings to the marketplace until an administrator reviews and approves their verification documents.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={dealerVerificationRequired}
                  onChange={e => setDealerVerificationRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Listing Expiry Days */}
            <div className="p-4 rounded-2xl bg-tile border border-border/70 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-text text-[13px] block">
                  Listing Expiry Duration (Days)
                </span>
                <p className="text-[11px] text-muted mt-0.5">
                  Default lifecycle duration for public vehicle listings before renewal is required (1 to 365 days).
                </p>
              </div>
              <div className="mt-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={listingExpiryDays}
                  onChange={e => setListingExpiryDays(e.target.value)}
                  className="w-32 px-3 py-1.5 rounded-xl bg-surface border border-border text-[12px] font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Categories Editor (Decision 1) */}
        <div className="p-6 rounded-[24px] bg-surface border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold text-text tracking-tight flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Vehicle Body Type Categories ({categories.length})
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                Managed categories populate the Listing Wizard body-type select and the Home &ldquo;Browse by type&rdquo; tiles.
              </p>
            </div>
          </div>

          {categoryError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[12px] flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{categoryError}</span>
            </div>
          )}

          {/* Add Category Bar */}
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="New category name (e.g. Crossover, Electric SUV)..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-full bg-tile border border-border text-[12px] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCategory}
              className="rounded-full text-[12px] shrink-0 px-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          {/* Categories Grid */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {categories.map((cat, idx) => {
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={`${cat}-${idx}`}
                  className="px-3.5 py-1.5 rounded-full bg-tile border border-border flex items-center gap-2 text-[12px] font-medium text-text group transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="w-24 px-1.5 py-0.5 rounded bg-surface border border-primary text-[11px] text-text focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(idx)}
                        className="text-success hover:opacity-80 p-0.5 cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="text-muted hover:text-text p-0.5 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{cat}</span>
                      <div className="flex items-center gap-1 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx)}
                          className="text-muted hover:text-text p-0.5 cursor-pointer"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(idx)}
                          className="text-muted hover:text-danger p-0.5 cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Announcement Bar Editor */}
        <div className="p-6 rounded-[24px] bg-surface border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-[16px] font-semibold text-text tracking-tight flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Global Announcement Bar
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Displays across all marketplace pages. Clear primary message to hide the bar.
            </p>
          </div>

          {/* Live Preview Band */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
              Live Preview
            </span>
            <div className="rounded-xl overflow-hidden border border-border/80">
              {message1.trim() ? (
                <AnnouncementBar
                  message1={message1.trim()}
                  message2={message2.trim()}
                  linkText={linkText.trim()}
                  onLinkClick={() => {}}
                />
              ) : (
                <div className="p-3 text-center bg-tile text-[11px] text-muted italic">
                  Announcement bar is currently empty and will not render to users.
                </div>
              )}
            </div>
          </div>

          {/* Announcement Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                Primary Message (Required to show)
              </label>
              <Input
                placeholder="e.g. Festival Season: Zero Platform Fees on Verified Listings"
                value={message1}
                onChange={e => setMessage1(e.target.value)}
                maxLength={200}
              />
              <span className="text-[10px] text-muted block mt-1">
                {message1.length}/200 chars
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                Secondary Note (Optional)
              </label>
              <Input
                placeholder="e.g. Valid until November 30"
                value={message2}
                onChange={e => setMessage2(e.target.value)}
                maxLength={200}
              />
              <span className="text-[10px] text-muted block mt-1">
                {message2.length}/200 chars
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                Link Button Text (Optional)
              </label>
              <Input
                placeholder="e.g. List your vehicle"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5">
                Link URL (/internal-path or https://)
              </label>
              <Input
                placeholder="e.g. /listing/new or https://roam.in/offer"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saveMutation.isPending}
            className="rounded-full text-[12px] px-8"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default AdminSettingsPage;
