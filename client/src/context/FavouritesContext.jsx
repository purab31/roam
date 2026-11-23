import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const FavouritesContext = createContext(null);

export function FavouritesProvider({ children }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const toast = addToast;
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch favourites when user logs in
  const fetchFavourites = async () => {
    if (!user) {
      setFavouriteIds(new Set());
      setFavourites([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/favourites', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setFavourites(data.data);
        const ids = new Set(
          data.data
            .map(item => item.listingId || item.listing?.id)
            .filter(Boolean)
        );
        setFavouriteIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch favourites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, [user]);

  const isFavourited = listingId => {
    if (!listingId) return false;
    return favouriteIds.has(listingId.toString());
  };

  const toggleFavourite = async (listingId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    if (!user) {
      toast({
        type: 'info',
        title: 'Sign in required',
        message: 'Please sign in to save vehicles to your favourites.',
      });
      return false;
    }

    const idStr = listingId.toString();
    const currentlyFav = favouriteIds.has(idStr);

    // Optimistic UI update
    setFavouriteIds(prev => {
      const next = new Set(prev);
      if (currentlyFav) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });

    try {
      if (currentlyFav) {
        // DELETE takes listing ID
        const res = await fetch(`/api/favourites/${idStr}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message);
        toast({
          type: 'success',
          title: 'Removed from saved',
          message: 'Vehicle removed from your favourites.',
        });
      } else {
        // POST takes listingId
        const res = await fetch('/api/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: idStr }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message);
        toast({
          type: 'success',
          title: 'Saved to favourites',
          message: 'Vehicle added to your saved list.',
        });
      }
      // Re-sync full list in background
      fetchFavourites();
      return true;
    } catch (err) {
      // Revert optimistic update
      setFavouriteIds(prev => {
        const next = new Set(prev);
        if (currentlyFav) {
          next.add(idStr);
        } else {
          next.delete(idStr);
        }
        return next;
      });
      toast({
        type: 'danger',
        title: 'Action failed',
        message: err.message || 'Could not update favourites.',
      });
      return false;
    }
  };

  return (
    <FavouritesContext.Provider
      value={{
        favourites,
        favouriteIds,
        loading,
        isFavourited,
        toggleFavourite,
        refetchFavourites: fetchFavourites,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
}
