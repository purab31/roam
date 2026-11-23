import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { useFavourites } from '../context/FavouritesContext';
import { VehicleCard } from '../components/vehicle/VehicleCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';

export function FavouritesPage() {
  const { favourites, loading, toggleFavourite } = useFavourites();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="w-48 h-8 rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="w-full h-[360px] rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!favourites || favourites.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="No saved vehicles"
          description="Click the heart icon on any vehicle card to save it here for quick access later."
          actionLabel="Explore Vehicles"
          onAction={() => navigate('/browse')}
          icon={Heart}
        />
      </div>
    );
  }

  const activeFavourites = favourites.filter(f => f.availability !== 'unavailable');
  const unavailableFavourites = favourites.filter(f => f.availability === 'unavailable');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Saved Collection
          </div>
          <h1 className="text-3xl font-light tracking-tight text-text">
            My Favourites ({favourites.length})
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/browse')}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>Browse More</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Active Vehicles Grid */}
      {activeFavourites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {activeFavourites.map(item => (
            <VehicleCard
              key={item.id}
              listing={item.listing}
              vehicle={item.listing?.vehicle || {}}
            />
          ))}
        </div>
      )}

      {/* Unavailable Items Group (Handled Gracefully without breaking) */}
      {unavailableFavourites.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border/60">
          <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
            No Longer Available
          </div>
          <p className="text-[12px] text-muted mb-6">
            These vehicles have been removed, sold, or are no longer active on the platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unavailableFavourites.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-[20px] bg-tile/60 border border-border/50 text-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface/80 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-muted/60" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-text/80">
                      Vehicle no longer available
                    </div>
                    <div className="text-[11px] text-muted">
                      Saved {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFavourite(item.listingId || item.id)}
                  className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
                  title="Remove from saved"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FavouritesPage;
