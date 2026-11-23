import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Scale, ArrowLeft, X, Plus, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useCompare } from '../context/CompareContext';
import { VehicleImage } from '../components/vehicle/VehicleImage';

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { removeFromCompare } = useCompare();

  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const idsParam = searchParams.get('ids') || '';

  useEffect(() => {
    async function fetchComparison() {
      if (!idsParam) {
        setLoading(false);
        setCompareData(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/compare?ids=${idsParam}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to compare vehicles');
        }

        setCompareData(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [idsParam]);

  const handleRemoveVehicle = idToRemove => {
    removeFromCompare(idToRemove);
    const currentIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    const newIds = currentIds.filter(id => id !== idToRemove);
    if (newIds.length > 0) {
      setSearchParams({ ids: newIds.join(',') });
    } else {
      setSearchParams({});
    }
  };

  if (!idsParam || (!loading && (!compareData || compareData.vehicles.length === 0))) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No vehicles selected for comparison"
          description="Browse our marketplace and add up to 3 vehicles to compare their specifications side-by-side."
          actionLabel="Browse Vehicles"
          onAction={() => navigate('/browse')}
          icon={Scale}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-48 h-8 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="w-full h-[260px] rounded-[24px]" />
              <Skeleton className="w-3/4 h-5 rounded-md" />
              <Skeleton className="w-1/2 h-4 rounded-md" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="w-full h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium text-text mb-2">Unable to load comparison</h2>
        <p className="text-muted text-sm mb-6 max-w-md mx-auto">{error}</p>
        <Button variant="primary" onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    );
  }

  const { vehicles = [], specs = [] } = compareData || {};
  const colCount = vehicles.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted hover:text-text hover:border-text transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Comparison
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-text">
              Side-by-Side Vehicle Specs
            </h1>
          </div>
        </div>

        {colCount < 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/browse')}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </Button>
        )}
      </div>

      {/* Difference Legend */}
      <div className="flex items-center gap-2 mb-6 text-[12px] text-muted">
        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
        <span>Accent dot marks specifications that differ across models</span>
      </div>

      {/* Comparison Table Container */}
      <div className="overflow-x-auto pb-8 scrollbar-none">
        <div className="min-w-[680px]">
          {/* Top Sticky Header Row: Vehicle Tiles */}
          <div className="sticky top-16 z-30 bg-bg/95 backdrop-blur-md pt-2 pb-6 border-b border-border/80">
            <div className="grid grid-cols-[180px_repeat(var(--cols),1fr)] gap-4 items-end"
                 style={{ '--cols': colCount }}>
              {/* Corner label */}
              <div className="text-[11px] font-medium text-muted uppercase tracking-wider pb-4">
                Vehicle Details
              </div>

              {/* Vehicle Cards */}
              {vehicles.map(v => (
                <div
                  key={v.id}
                  className="relative flex flex-col bg-tile rounded-[24px] p-4 border border-border/50 group"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveVehicle(v.id)}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-surface/90 border border-border/60 flex items-center justify-center text-muted hover:text-danger hover:scale-110 transition-all shadow-sm"
                    title="Remove from comparison"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-full h-40 rounded-[18px] overflow-hidden bg-surface mb-3 flex items-center justify-center">
                    <VehicleImage
                      src={v.coverImage}
                      alt={v.title}
                      bodyType={v.bodyType}
                      fuelType={v.fuelType}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      lazy={false}
                    />
                  </div>

                  <Link
                    to={`/listings/${v.id}`}
                    className="text-[14px] font-medium text-text hover:text-accent truncate tracking-tight transition-colors"
                  >
                    {v.title}
                  </Link>

                  <div className="text-[13px] font-semibold text-text mt-0.5">
                    {v.price}
                  </div>

                  <div className="mt-3">
                    <Link
                      to={`/listings/${v.id}`}
                      className="inline-flex items-center justify-center w-full py-1.5 px-3 text-[11px] font-medium rounded-full bg-surface hover:bg-surface/80 border border-border/60 text-text transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specification Rows with Dotted Leader Style */}
          <div className="divide-y divide-border/40 mt-4">
            {specs.map(spec => (
              <div
                key={spec.key}
                className={`grid grid-cols-[180px_repeat(var(--cols),1fr)] gap-4 py-3.5 items-center hover:bg-tile/40 transition-colors rounded-lg px-2 ${
                  spec.isDifferent ? 'bg-accent/[0.02]' : ''
                }`}
                style={{ '--cols': colCount }}
              >
                {/* Spec Label + Difference Dot */}
                <div className="flex items-center gap-1.5 pr-2">
                  {spec.isDifferent && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                      title="Values differ"
                    />
                  )}
                  <span className={`text-[12px] tracking-tight ${spec.isDifferent ? 'font-medium text-text' : 'text-muted'}`}>
                    {spec.label}
                  </span>
                </div>

                {/* Values across columns */}
                {spec.values.map((val, idx) => (
                  <div
                    key={idx}
                    className={`text-[12px] tracking-tight pr-4 ${
                      spec.isDifferent
                        ? 'font-medium text-text'
                        : 'text-muted'
                    }`}
                  >
                    {val}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
