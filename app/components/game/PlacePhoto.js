"use client"

import {useEffect, useState} from "react";
import Link from "next/link";

export default function PlacePhoto({photoName, attributions, altText}) {
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY
  const imageUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`;

  const attributionText = attributions?.[0]?.displayName || null;
  const attributionUri = attributions?.[0]?.uri || null;
  const attributionPhotoUri = attributions?.[0]?.photoUri || null;

  return (
    <div className="h-screen w-screen">
      <img
      src={imageUrl}
      alt={altText || "Photo Location"}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.src = "https://places.googleapis.com/v1/place/" + photoName;
      }}
      />

      {attributionText && (
        <div>
          {/* Photographer Profile picture */}
          {attributionPhotoUri && (
            <img
            src={attributionUri}
            alt="Photographer"
            className="w-full h-full rounded-full"
            />
          )}

          {/* Photographer Name */}
          {attributionText ? (
          <a
            href={attributionUri}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Photo by: {attributionText}
          </a>
          ) : (
            <span> Photo by: {attributionText} </span>
          )}
        </div>
      )}
    </div>
  );
}