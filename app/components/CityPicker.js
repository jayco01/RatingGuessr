"use client";

import { useState, useEffect, useRef } from "react";

export default function CityPicker({ onCitySelect }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const sessionTokenRef = useRef("");
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.crypto) {
      sessionTokenRef.current = crypto.randomUUID();
    }
  }, []);

  // Search a city function
  const fetchPredictions = async (input) => {
    if (!input) {
      setPredictions([]);
      return;
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input: input,
          includedPrimaryTypes: ["(cities)"],
          sessionToken: sessionTokenRef.current,
        }),
      });

      const data = await response.json();
      setPredictions(data.suggestions || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Autocomplete Error:", error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  const handleSelect = async (prediction) => {
    const placeId = prediction.placePrediction?.placeId;
    const mainText = prediction.placePrediction?.structuredFormat?.mainText?.text;

    if (!placeId) return;

    setQuery(mainText);
    setIsOpen(false);
    setPredictions([]);

    try {
      const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,id&sessionToken=${sessionTokenRef.current}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "location,id",
          },
        }
      );

      const placeDetails = await response.json();

      if (placeDetails.location) {
        onCitySelect({
          name: mainText,
          lat: placeDetails.location.latitude,
          lng: placeDetails.location.longitude,
        });

        if (typeof window !== "undefined" && window.crypto) {
          sessionTokenRef.current = crypto.randomUUID();
        }
      }
    } catch (error) {
      console.error("Place Details Error:", error);
    }
  };

  return (
    <div className="relative z-50 w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search for a city (e.g. Tokyo)..."
        className="w-full px-4 py-3 rounded-full text-evergreen-200 font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-evergreen-700 bg-lime-50"
      />

      {isOpen && predictions.length > 0 && (
        <ul className="absolute top-14 left-0 w-full bg-white rounded-xl shadow-xl overflow-hidden text-black">
          {predictions.map((item, index) => {
            const pred = item.placePrediction;
            if (!pred) return null; // Guard clause

            return (
              <li
                key={pred.placeId || index}
                onClick={() => handleSelect(item)}
                className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-none flex flex-col"
              >
                <span className="font-bold">{pred.structuredFormat.mainText.text}</span>
                <span className="text-xs text-gray-500">{pred.structuredFormat.secondaryText?.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}