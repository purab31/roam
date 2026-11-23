import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Car, Plus, AlertCircle, Calendar, Gauge, Fuel } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { VehicleImage } from '../../components/vehicle/VehicleImage';

export function MyVehiclesPage() {
  const navigate = useNavigate();

  const {
    data: vehicles = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load vehicles');
      }
      return data.data;
    },
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-light tracking-tight text-text">
              My Registered Vehicles
            </h1>
            <p className="text-[12px] text-muted">
              Vehicles you have registered on Roam. You can manage photos and create marketplace listings.
            </p>
          </div>

          <Link to="/listing/new">
            <Button variant="primary" size="md" className="text-[12px]">
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Vehicle
            </Button>
          </Link>
        </div>

        {/* Loading State: Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="bg-surface rounded-[24px] border border-border p-5 flex flex-col gap-4 shadow-sm"
              >
                <Skeleton className="w-full h-44 rounded-[16px]" />
                <Skeleton className="w-3/4 h-5" />
                <Skeleton className="w-1/2 h-4" />
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Skeleton className="w-20 h-8 rounded-full" />
                  <Skeleton className="w-20 h-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-surface rounded-[24px] border border-danger/30 p-8 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="w-10 h-10 text-danger" />
            <h3 className="text-[16px] font-medium text-text">Could not load vehicles</h3>
            <p className="text-[12px] text-muted max-w-md">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && vehicles.length === 0 && (
          <div className="bg-surface rounded-[24px] border border-border p-12">
            <EmptyState
              icon={Car}
              title="No Vehicles Registered Yet"
              description="Register your vehicle on Roam to easily create sale or rental listings and receive direct purchase offers."
              actionLabel="Register & List Vehicle"
              onAction={() => navigate('/listing/new')}
            />
          </div>
        )}

        {/* Vehicles Grid */}
        {!isLoading && !isError && vehicles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map(v => {
              const coverImg =
                v.images?.find(i => i.isCover)?.url || v.images?.[0]?.url || null;

              return (
                <div
                  key={v.id || v._id}
                  className="bg-surface rounded-[24px] border border-border overflow-hidden flex flex-col justify-between shadow-sm hover:border-text/30 transition-colors"
                >
                  {/* Photo / Tile Area */}
                  <div className="relative w-full h-48 bg-tile flex items-center justify-center overflow-hidden">
                    <VehicleImage
                      src={coverImg}
                      alt={`${v.brand} ${v.model}`}
                      bodyType={v.bodyType}
                      fuelType={v.fuelType}
                      className="w-full h-full object-cover"
                      lazy={true}
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface/90 text-text backdrop-blur-sm border border-border/40">
                      {v.bodyType}
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-medium bg-surface/90 text-muted backdrop-blur-sm border border-border/40">
                      Reg: {v.registrationNumber}
                    </span>
                  </div>

                  {/* Vehicle Body Info */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div>
                      <h3 className="text-[16px] font-semibold text-text tracking-tight">
                        {v.brand} {v.model} {v.variant}
                      </h3>
                      <span className="text-[11px] text-muted block mt-0.5">
                        {v.location?.city}, {v.location?.state}
                      </span>
                    </div>

                    {/* Spec Indicators */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/60 text-[11px] text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{v.manufacturingYear}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{v.kmDriven?.toLocaleString()} km</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5" />
                        <span>{v.fuelType}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 mt-auto">
                      <span className="text-[10px] text-muted">
                        {v.images?.length || 0} photos · {v.condition}
                      </span>
                      <Link to="/listing/new">
                        <Button variant="outline" size="sm" className="text-[11px] h-8 px-3">
                          Create Listing
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
