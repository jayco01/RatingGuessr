"use client"

import {useState, useEffect} from "react";

export default function GamePage() {
  const [gameQueue, setGameQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const TEST_CITY = {
    lat: 51.0447,
    lng: -114.0719,
    category: "restaurant"
  };

  useEffect(() => {
    async function fetchGameBatch() {
      try {
        const response = await fetch("/api/game/batch", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(TEST_CITY),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = await response.json();
        setGameQueue(data);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGameBatch();
  }, []);

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

  const firstLocation = gameQueue[4];

  return (
    <div className="w-screen h-screen">
      <h1>
        Location: {firstLocation.name}
      </h1>

      <div className="w-full h-full">
      <StreetView lat={firstLocation.location.latitude} lng={firstLocation.location.longitude} />
      </div>

      <div>
      <p>{firstLocation.name}</p>
      <p>Rating: {firstLocation.rating} ({firstLocation.userRatingCount} reviews)</p>
      </div>
    </div>
  )
}