import React, { useState, useEffect } from 'react';
import { Carousel } from './Carousel';
import { VehicleCard } from '../vehicle/VehicleCard';
import { useAuth } from '../../context/AuthContext';

/**
 * UI 7.9 & 7.10 Recently Viewed Vehicles Carousel:
 * Displays up to 20 previously viewed vehicles.
 */
export function RecentlyViewedCarousel({ currentListingId = null }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRecentlyViewed() {
      if (!user) return;
      try {
        setLoading(true);
        const res = await fetch('/api/recently-viewed');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Filter out the current listing being viewed if provided
          const filtered = data.data
            .filter(item => {
              const id = item.listing?.id || item.listing?._id;
              return id && id.toString() !== currentListingId?.toString();
            })
            .map(item => item.listing);
          setItems(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch recently viewed vehicles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentlyViewed();
  }, [user, currentListingId]);

  if (!user || loading || items.length === 0) {
    return null;
  }

  return (
    <section className="py-12 border-t border-border/40">
      <Carousel
        eyebrow="Your History"
        headline="Recently viewed"
        description="Jump back to vehicles you inspected recently."
        itemsCount={items.length}
        arrowLink="/favourites"
      >
        {items.map(listing => (
          <div key={listing.id || listing._id} className="snap-start shrink-0">
            <VehicleCard
              listing={listing}
              vehicle={listing.vehicle || {}}
              className="w-[260px] sm:w-[270px]"
            />
          </div>
        ))}
      </Carousel>
    </section>
  );
}

export default RecentlyViewedCarousel;
