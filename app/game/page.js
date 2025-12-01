"use client"

import {useState, useEffect, useCallback} from "react";
import PlacePhoto from "@/app/components/game/PlacePhoto";
import {FaArrowUp, FaArrowDown, FaStar, FaRedo} from "react-icons/fa";

export default function GamePage() {
  // (LOADING -> PLAYING -> GAMEOVER)
  const [gameState, setGameState] = useState("LOADING");
  const [score, setScore] = useState(0);

  // The two cards currently on the "Board"
  const [leftPlace, setLeftPlace] = useState(null);
  const [rightPlace, setRightPlace] = useState(null);

  // The Queue (Buffer)
  const [placeQueue, setPlaceQueue] = useState([]);

  const TEST_CITY = {
    lat: 51.0447,
    lng: -114.0719,
    category: "restaurant"
  };

  const fetchBatch = useCallback(async () => {
    try {
      const response = await fetch("/api/game/batch", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(TEST_CITY),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Game Batch: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return[];
    }
  });


  if(isLoading) {
    return <div>Loading...</div>;
  }

  if(error){
    return <div>Something went wrong...</div>;
  }

  if(gameQueue.length == 0){
    return (
      <div>No Places Found.</div>
    )
  }

  const firstLocation = gameQueue[2];

  return (
    <div className="w-screen h-screen">
      <h1>
        Location: {firstLocation.name}
      </h1>

      <div className="w-full h-96 relative">
        <PlacePhoto
          photos={firstLocation.photos}
          altText={firstLocation.name}
        />
      </div>

      <div>
      <p>{firstLocation.name}</p>
      <p>Rating: {firstLocation.rating} ({firstLocation.userRatingCount} reviews)</p>
      </div>
    </div>
  )
}