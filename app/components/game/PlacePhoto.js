"use client"

import { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaCamera } from "react-icons/fa";

export default function PlacePhoto({photos, altText}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

  if(!photos || photos.length === 0) {
    return (
      <div className="bg-gray-200 w-full h-full flex items-center justify-center">
        <FaCamera className="text-4xl text-gray-400"/>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];
  // handle case where photo might not have name property
  const photoName = currentPhoto?.name;

  const imageUrl = photoName
    ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`
    : null;

  const attribution = currentPhoto.attributions?.[0];

  const nextSlide = () => {
    setCurrentIndex((previous) => (previous === photos.length - 1 ? 0 : previous + 1));
  }

  const previousSlide = () => {
    setCurrentIndex((previous) => (previous === 0 ? photos.length - 1 : previous - 1));
  }

  if (!imageUrl) return <div className="bg-gray-200 w-full h-full" />;

  return (
    <div className="relative w-full h-full group">
      {/* Main Image */}
      <img
        src={imageUrl}
        alt={altText || "Location Photo"}
        className="w-full h-full object-cover"
      />

      {/* Attribution Overlay */}
      {attribution && (
        <div className="absolute bottom-2 right-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-auto">
          {attribution.uri ? (
            <a href={attribution.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {attribution.displayName}
            </a>
          ) : (
            <span>{attribution.displayName}</span>
          )}
        </div>
      )}

      {/* Navigation Arrows (Only show if >1 photo) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={previousSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 p-4 rounded-full text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/50 pointer-events-auto"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 p-4 rounded-full text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/50 pointer-events-auto"
          >
            <FaChevronRight />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {photos.map((_, idx) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}