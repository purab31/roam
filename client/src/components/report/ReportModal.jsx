import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Flag } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../../context/ToastContext';

const REPORT_CATEGORIES = [
  { value: 'misleading', label: 'Misleading vehicle or pricing information' },
  { value: 'fraud', label: 'Suspected fraud, scam, or fake listing' },
  { value: 'inappropriate_media', label: 'Inappropriate or copyrighted photographs' },
  { value: 'suspicious_account', label: 'Suspicious or compromised user account' },
  { value: 'misleading_dealer', label: 'Misleading dealership or credentials' },
  { value: 'other', label: 'Other platform policy violation' },
];

/**
 * ReportModal per Spec Section 15 & UI Section 12:
 * Modal for submitting policy violations on listings, dealerships, or users.
 * Keyboard accessible, visible focus ring, validation on category and description (min 5 chars).
 */
export function ReportModal({
  isOpen,
  onClose,
  subjectType, // 'listing' | 'dealer' | 'user'
  subjectRef,  // ObjectId string
  subjectTitle = '',
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('misleading');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setCategory('misleading');
    setDescription('');
    setError('');
    onClose();
  };

  const reportMutation = useMutation({
    mutationFn: async payload => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit report');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-reports']);
      addToast(
        'Thank you. Your report has been submitted for administrative review.',
        'success'
      );
      handleClose();
    },
    onError: err => {
      setError(err.message || 'Failed to submit report. Please try again.');
    },
  });

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    const trimmedDesc = description.trim();
    if (!category) {
      setError('Please select a report category.');
      return;
    }
    if (trimmedDesc.length < 5) {
      setError('Description must be at least 5 characters explaining the concern.');
      return;
    }
    if (trimmedDesc.length > 2000) {
      setError('Description cannot exceed 2000 characters.');
      return;
    }

    reportMutation.mutate({
      subjectType,
      subjectRef,
      category,
      description: trimmedDesc,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report Violation"
      description={`Submit a confidential report regarding ${subjectTitle || `this ${subjectType}`}. Platform moderators review all reports promptly.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[12px] flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="report-category"
            className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5"
          >
            Reason for Report *
          </label>
          <Select
            id="report-category"
            options={REPORT_CATEGORIES}
            value={category}
            onChange={val => {
              setCategory(val);
              setError('');
            }}
          />
        </div>

        <div>
          <label
            htmlFor="report-description"
            className="block text-[11px] font-medium uppercase tracking-wider text-muted mb-1.5"
          >
            Details & Context (min 5 characters) *
          </label>
          <Textarea
            id="report-description"
            rows={4}
            placeholder="Please describe why you are reporting this. Include specific discrepancies, date of communication, or policy concerns..."
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              if (error) setError('');
            }}
            className="w-full text-[12px]"
          />
          <div className="flex justify-between items-center text-[10px] text-muted mt-1 px-1">
            <span>Confidential review by platform administrators</span>
            <span>{description.trim().length} / 2000</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={reportMutation.isPending}
            className="rounded-full text-[12px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={reportMutation.isPending}
            className="rounded-full text-[12px] px-5"
          >
            {reportMutation.isPending ? (
              'Submitting...'
            ) : (
              <>
                <Flag className="w-3.5 h-3.5 mr-1.5" />
                <span>Submit Report</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReportModal;
