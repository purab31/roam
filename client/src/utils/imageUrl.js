/**
 * Image URL Resolution and Placeholder Helpers
 * Provides cross-origin URL resolution and neutral silhouette SVG fallbacks (UI doc section 9).
 */

export function getApiOrigin() {
  const envUrl =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) ||
    '';
  return envUrl ? envUrl.replace(/\/+$/, '') : '';
}

export function resolveImageUrl(src) {
  if (!src || typeof src !== 'string') return '';

  // Already absolute or data/blob URI
  if (/^(https?:|\/\/|data:|blob:)/i.test(src)) {
    return src;
  }

  // If path starts with /uploads or /images/cars and an API origin is specified
  if (src.startsWith('/uploads') || src.startsWith('/images/cars')) {
    const origin = getApiOrigin();
    return origin ? `${origin}${src}` : src;
  }

  return src;
}

export function getVehiclePlaceholder(bodyType = '', fuelType = '') {
  const normFuel = String(fuelType || '').toLowerCase();
  const normBody = String(bodyType || '').toLowerCase();

  if (normFuel === 'electric' || normFuel === 'ev') {
    return '/placeholders/placeholder-electric.svg';
  }
  if (normBody.includes('sedan')) {
    return '/placeholders/placeholder-sedan.svg';
  }
  if (normBody.includes('hatchback')) {
    return '/placeholders/placeholder-hatchback.svg';
  }
  if (normBody.includes('luxury')) {
    return '/placeholders/placeholder-luxury.svg';
  }
  if (normBody.includes('suv') || normBody.includes('minivan')) {
    return '/placeholders/placeholder-suv.svg';
  }

  return '/placeholders/placeholder-suv.svg';
}
