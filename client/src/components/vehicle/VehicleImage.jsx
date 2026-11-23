import React, { useState, useEffect } from 'react';
import { resolveImageUrl, getVehiclePlaceholder } from '../../utils/imageUrl';

/**
 * Shared VehicleImage Component (UI doc section 9)
 * - Resolves uploaded and public asset URLs across environments.
 * - Displays the real vehicle image with object-fit: cover.
 * - Automatically falls back to a neutral vehicle silhouette SVG (matching body/fuel type)
 *   if the image fails to load or the URL is empty.
 * - Supports lazy-loading below the fold and accessible descriptive alt text.
 */
export function VehicleImage({
  src = null,
  alt = 'Roam vehicle',
  bodyType = '',
  fuelType = '',
  className = '',
  lazy = true,
  onLoad = null,
  onError = null,
  ...props
}) {
  const placeholder = getVehiclePlaceholder(bodyType, fuelType);
  const resolved = src ? resolveImageUrl(src) : placeholder;

  const [currentSrc, setCurrentSrc] = useState(resolved);
  const [failed, setFailed] = useState(false);

  // Sync state whenever the source prop changes
  useEffect(() => {
    const nextUrl = src ? resolveImageUrl(src) : placeholder;
    setCurrentSrc(nextUrl);
    setFailed(false);
  }, [src, bodyType, fuelType, placeholder]);

  const handleError = e => {
    if (!failed && currentSrc !== placeholder) {
      setFailed(true);
      setCurrentSrc(placeholder);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      onError={handleError}
      onLoad={onLoad}
      className={`object-cover ${className}`}
      {...props}
    />
  );
}
