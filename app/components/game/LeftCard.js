"use client";

import PlacePhoto from "@/app/components/game/PlacePhoto";
import { FaHeart } from "react-icons/fa";

export default function LeftCard({ place, onFavorite }) {
  return (
    <div className="relative md:w-1/2 md:h-full h-1/2 border-r-4 border-white">
      {/* Heart Button */}
      <button
        onClick={onFavorite}
        className="absolute top-16 right-4 z-40 p-3 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-red-500 hover:text-white transition group border border-white/20"
        title="Save to Favorites"
      >
        <FaHeart className="text-2xl text-white/80 group-hover:text-white" />
      </button>

      <PlacePhoto photos={place?.photos} altText={place?.name} />

      {/* Info Overlay */}
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
        <h2 className="text-3xl font-bold text-white mb-2">{place?.name}</h2>
        <p className="text-5xl font-extrabold text-lime_cream">
          {place?.rating ? place.rating.toFixed(1) : "N/A"}
        </p>
        <p className="text-sm text-gray-300 mt-2">Google Rating</p>
      </div>
    </div>
  );
}