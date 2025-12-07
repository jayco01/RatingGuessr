"use client";

import CityPicker from "@/app/components/CityPicker";

export default function LobbyView({ onCitySelect }) {
  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-evergreen-200 gap-8 p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-lime_cream text-center">Rating Guessr</h1>
      <p className="text-white text-xl">Pick a city to start exploring.</p>

      <CityPicker onCitySelect={onCitySelect} />

      <div className="flex gap-4 text-sm text-gray-400">
        <span>Try: </span>
        <button
          onClick={() => onCitySelect({lat: 40.7128, lng: -74.0060, name: "New York"})}
          className="hover:text-white underline"
        >
          New York
        </button>
        <button
          onClick={() => onCitySelect({lat: 35.6762, lng: 139.6503, name: "Tokyo"})}
          className="hover:text-white underline"
        >
          Tokyo
        </button>
      </div>
    </div>
  );
}