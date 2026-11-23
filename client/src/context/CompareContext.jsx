import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const CompareContext = createContext(null);
const STORAGE_KEY = 'roam_compare_vehicles';

export function CompareProvider({ children }) {
  const { addToast } = useToast();
  const toast = addToast;
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareItems));
    } catch (err) {
      console.error('Failed to persist compare items:', err);
    }
  }, [compareItems]);

  const isInCompare = listingId => {
    if (!listingId) return false;
    return compareItems.some(item => item.id.toString() === listingId.toString());
  };

  const removeFromCompare = id => {
    setCompareItems(prev => prev.filter(item => item.id.toString() !== id.toString()));
  };

  const clearCompare = () => {
    setCompareItems([]);
  };

  const addToCompare = vehicleItem => {
    const id = vehicleItem.id || vehicleItem._id;
    if (!id) return;

    if (isInCompare(id)) {
      removeFromCompare(id);
      return;
    }

    if (compareItems.length >= 3) {
      toast({
        type: 'warning',
        title: 'Compare limit reached',
        message: 'You can compare up to 3 vehicles at a time. Remove one to add another.',
      });
      return;
    }

    setCompareItems(prev => [
      ...prev,
      {
        id: id.toString(),
        title: vehicleItem.title || `${vehicleItem.brand || ''} ${vehicleItem.model || ''}`,
        price: vehicleItem.price || '',
        coverImage:
          vehicleItem.coverImage ||
          vehicleItem.images?.[0]?.url ||
          '/placeholders/placeholder-suv.svg',
      },
    ]);

    toast({
      type: 'success',
      title: 'Added to compare',
      message: `Added to comparison tray (${compareItems.length + 1}/3).`,
    });
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        isInCompare,
        addToCompare,
        removeFromCompare,
        clearCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
