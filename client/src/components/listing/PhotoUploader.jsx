import React, { useRef, useState } from 'react';
import { Upload, X, Star, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { VehicleImage } from '../vehicle/VehicleImage';

/**
 * UI 8.7 Photo Uploader:
 * - Dashed 24px-radius drop zone.
 * - Reorderable thumbnails with the 2px left-line indicator on the cover photo.
 * - Cover image selector and delete action.
 */
export function PhotoUploader({
  images = [],
  onImagesChange,
  maxImages = 15,
  error = null,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = files => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const newItems = [];

    Array.from(files).forEach(file => {
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not an allowed image format (JPEG, PNG, WebP)`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5MB size limit`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `temp-${Date.now()}-${Math.random()}`,
        file,
        url: previewUrl,
        isCover: images.length === 0 && newItems.length === 0,
        name: file.name,
      });
    });

    if (newItems.length > 0) {
      const updated = [...images, ...newItems].slice(0, maxImages);
      // Ensure at least one image is cover
      if (!updated.some(i => i.isCover) && updated.length > 0) {
        updated[0].isCover = true;
      }
      onImagesChange(updated);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = e => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const setCover = index => {
    const updated = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onImagesChange(updated);
  };

  const removeImage = index => {
    const isRemovingCover = images[index].isCover;
    const updated = images.filter((_, i) => i !== index);

    if (isRemovingCover && updated.length > 0) {
      updated[0].isCover = true;
    }
    onImagesChange(updated);
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onImagesChange(updated);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Dashed 24px-radius Tile Drop Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 rounded-[24px] border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-text/60 bg-tile/40 hover:bg-tile/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-muted mb-3 group-hover:scale-105 transition-transform">
          <Upload className="w-5 h-5 text-text" />
        </div>

        <h4 className="text-[14px] font-medium text-text mb-1">
          Click or drag & drop photographs here
        </h4>
        <p className="text-[11px] text-muted max-w-sm mb-3">
          Upload up to {maxImages} images (JPEG, PNG, WebP, max 5MB each). We recommend front 3/4 angle shots on clean backgrounds.
        </p>

        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium bg-surface text-text border border-border shadow-sm">
          <ImageIcon className="w-3.5 h-3.5" />
          Browse Files
        </span>
      </div>

      {error && <span className="text-[11px] text-danger">{error}</span>}

      {/* 2. Reorderable Thumbnails with 2px Left-Line Indicator for Cover */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-muted px-1">
            <span>
              {images.length} of {maxImages} photos uploaded
            </span>
            <span>The cover photo has the solid left-line indicator</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id || img.url || index}
                className={`relative group h-36 rounded-[16px] bg-tile overflow-hidden border transition-all ${
                  img.isCover
                    ? 'border-text/80 ring-1 ring-text/30 shadow-sm'
                    : 'border-border/60 hover:border-border'
                }`}
              >
                {/* 2px Solid Left Active / Cover Line from gallery rail */}
                {img.isCover && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-text rounded-r z-20" />
                )}

                {/* Thumbnail Image */}
                <VehicleImage
                  src={img.url}
                  alt={img.name || `Vehicle photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  lazy={false}
                />

                {/* Cover Badge */}
                {img.isCover && (
                  <span className="absolute top-2 left-3 z-10 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded-full bg-surface/90 text-text backdrop-blur-sm border border-border/40 shadow-sm">
                    Cover
                  </span>
                )}

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-10 text-white">
                  {/* Top Bar Actions: Remove */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="w-6 h-6 rounded-full bg-black/60 hover:bg-danger text-white flex items-center justify-center transition-colors"
                      title="Delete photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Bar Actions: Set Cover & Reorder */}
                  <div className="flex items-center justify-between gap-1">
                    {!img.isCover ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setCover(index);
                        }}
                        className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-colors flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" />
                        Set Cover
                      </button>
                    ) : (
                      <span className="text-[10px] text-white/80 font-medium">Main</span>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={e => {
                          e.stopPropagation();
                          moveImage(index, index - 1);
                        }}
                        className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Move earlier"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={e => {
                          e.stopPropagation();
                          moveImage(index, index + 1);
                        }}
                        className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Move later"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
