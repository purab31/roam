import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  ChevronLeft,
  Info,
  Building2,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

const SAMPLE_CSV = `brand,model,variant,bodyType,manufacturingYear,registrationYear,registrationNumber,fuelType,transmission,kmDriven,previousOwners,condition,colour,seatingCapacity,city,state,pincode,askingPrice,purpose
Maruti,Swift,ZXi,Hatchback,2020,2020,MH02AB1111,Petrol,Manual,30000,1,Good,White,5,Mumbai,Maharashtra,400053,550000,sale
Hyundai,i20,Sportz,Hatchback,2019,2019,MH02CD2222,Petrol,Manual,45000,1,Good,Red,5,Mumbai,Maharashtra,400053,480000,sale
Tata,Nexon,XZ+,SUV,2021,2021,MH02EF3333,Diesel,Manual,38000,1,Excellent,Blue,5,Mumbai,Maharashtra,400053,820000,sale`;

export function BulkUploadPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState('atomic');
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [inputTab, setInputTab] = useState('file'); // 'file' | 'text'
  const [result, setResult] = useState(null);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'roam_dealer_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      setResult(null);
      let res;

      if (inputTab === 'file' && csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);
        formData.append('mode', mode);

        res = await fetch('/api/dealers/inventory/bulk-upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      } else {
        if (!csvText.trim()) throw new Error('CSV text is empty');
        res = await fetch('/api/dealers/inventory/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ mode, csvText }),
        });
      }

      const json = await res.json();
      return json;
    },
    onSuccess: json => {
      setResult(json.data || json);
      queryClient.invalidateQueries(['dealer-inventory']);
      queryClient.invalidateQueries(['dealer-dashboard-stats']);

      if (json.success) {
        addToast(
          `Bulk upload finished: ${json.data?.saved || 0} listings imported successfully!`,
          'success'
        );
      } else {
        addToast('Bulk upload encountered validation errors', 'error');
      }
    },
    onError: err => {
      addToast(err.message || 'Bulk upload request failed', 'error');
    },
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (inputTab === 'file' && !csvFile) {
      addToast('Please select a CSV file to upload', 'error');
      return;
    }
    if (inputTab === 'text' && !csvText.trim()) {
      addToast('Please paste valid CSV content', 'error');
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8 select-none">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Inventory</span>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-primary" />
              <h1 className="text-[24px] sm:text-[28px] font-semibold text-text tracking-tight">
                Bulk CSV Inventory Upload
              </h1>
            </div>
            <p className="text-[13px] text-muted">
              Import multiple vehicles directly into your catalogue using a structured CSV file.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={handleDownloadSample}
            className="rounded-full text-[12px] shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Download Template CSV</span>
          </Button>
        </div>

        {/* Upload Mode Selector & Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setMode('atomic')}
            className={`p-5 rounded-[22px] border cursor-pointer transition-all ${
              mode === 'atomic'
                ? 'bg-surface border-text shadow-sm'
                : 'bg-tile/50 border-border text-muted hover:border-text/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-text">
                Atomic Mode (Strict)
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  mode === 'atomic' ? 'border-text bg-text text-bg' : 'border-border'
                }`}
              >
                {mode === 'atomic' && <span className="w-1.5 h-1.5 rounded-full bg-bg" />}
              </span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              All-or-nothing rollback. If any single row fails validation, nothing is saved to your inventory.
            </p>
          </div>

          <div
            onClick={() => setMode('partial')}
            className={`p-5 rounded-[22px] border cursor-pointer transition-all ${
              mode === 'partial'
                ? 'bg-surface border-text shadow-sm'
                : 'bg-tile/50 border-border text-muted hover:border-text/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-text">
                Partial Mode (Flexible)
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  mode === 'partial' ? 'border-text bg-text text-bg' : 'border-border'
                }`}
              >
                {mode === 'partial' && <span className="w-1.5 h-1.5 rounded-full bg-bg" />}
              </span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              Saves all valid vehicle records into inventory and provides an actionable error report for invalid rows.
            </p>
          </div>
        </div>

        {/* Upload Form Container */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-surface border border-border shadow-sm">
          {/* Input Method Toggle */}
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <button
              type="button"
              onClick={() => setInputTab('file')}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                inputTab === 'file'
                  ? 'bg-text text-bg'
                  : 'text-muted hover:text-text'
              }`}
            >
              Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => setInputTab('text')}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                inputTab === 'text'
                  ? 'bg-text text-bg'
                  : 'text-muted hover:text-text'
              }`}
            >
              Paste CSV Content
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {inputTab === 'file' ? (
              <div className="border-2 border-dashed border-border hover:border-text/40 rounded-[24px] p-8 sm:p-12 text-center transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-tile border border-border mx-auto flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-muted" />
                </div>
                <h3 className="text-[14px] font-medium text-text mb-1">
                  {csvFile ? csvFile.name : 'Select or drop your CSV inventory file'}
                </h3>
                <p className="text-[11px] text-muted mb-4">
                  Maximum file size 5MB · Up to 500 vehicle rows per batch
                </p>

                <label className="cursor-pointer inline-block">
                  <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-tile border border-border hover:bg-tile/80 text-[12px] font-medium text-text transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{csvFile ? 'Replace File' : 'Choose CSV File'}</span>
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-medium text-text mb-2">
                  Paste Raw CSV Data
                </label>
                <textarea
                  rows={8}
                  placeholder={SAMPLE_CSV}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-tile border border-border font-mono text-[11px] text-text focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <Info className="w-4 h-4 text-primary" />
                <span>Imported rows are saved as Drafts. Verified dealers can publish directly.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={uploadMutation.isPending}
                className="rounded-full px-8"
              >
                {uploadMutation.isPending ? 'Processing Batch...' : 'Process & Import CSV'}
              </Button>
            </div>
          </form>
        </div>

        {/* Results / Error Table */}
        {result && (
          <div className="p-6 sm:p-8 rounded-[28px] bg-surface border border-border shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-[16px] font-semibold text-text tracking-tight">
                  Import Summary Report
                </h3>
                <p className="text-[12px] text-muted">
                  Batch processing details for mode: <strong className="capitalize">{mode}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{result.saved || 0} Imported</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400 font-semibold bg-red-500/10 px-3 py-1 rounded-full">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{result.failed || 0} Failed</span>
                </span>
              </div>
            </div>

            {/* Error Table if any errors */}
            {result.errors && result.errors.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[13px] font-semibold text-text flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Row Validation Errors ({result.errors.length})</span>
                </h4>

                <div className="rounded-2xl border border-border overflow-hidden">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead className="bg-tile border-b border-border text-[11px] uppercase tracking-wider text-muted font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 w-20">Row</th>
                        <th className="py-2.5 px-4 w-36">Field</th>
                        <th className="py-2.5 px-4">Error Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {result.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-tile/40">
                          <td className="py-2.5 px-4 font-mono font-bold text-text">
                            #{err.row || '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-muted">
                            {err.field || 'general'}
                          </td>
                          <td className="py-2.5 px-4 text-red-600 dark:text-red-400">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[12px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All CSV records passed validation and were successfully added to inventory!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default BulkUploadPage;
