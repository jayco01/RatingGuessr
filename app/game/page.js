"use client"

import {useState, useEffect, useCallback} from "react";
import PlacePhoto from "@/app/components/game/PlacePhoto";
import {FaArrowUp, FaArrowDown, FaStar, FaRedo, FaArrowRight} from "react-icons/fa";

export default function GamePage() {
  // STATES: LOADING -> PLAYING -> ROUND_WIN -> GAMEOVER
  const [gameState, setGameState] = useState("LOADING");
  const [score, setScore] = useState(0);

  // The two cards currently on the "Board"
  const [leftPlace, setLeftPlace] = useState(null);
  const [rightPlace, setRightPlace] = useState(null);

  // The Queue (Buffer)
  const [placeQueue, setPlaceQueue] = useState([]);

  const TEST_CITY = {
    lat: 40.7128,
    lng: -74.0060,
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
  }, []);

  useEffect(() => {
    const initGame = async () => {
      const batch = await fetchBatch();
      if (batch.length >= 2) {
        setLeftPlace(batch[0]);
        setRightPlace(batch[1]);
        setPlaceQueue(batch.slice(2));
        setGameState("PLAYING");
      }
    };
    initGame();
  }, [fetchBatch])


  const handleGuess = (guess) => {
    if (gameState !== "PLAYING") return;

    const leftRating = leftPlace.rating;
    const rightRating = rightPlace.rating;

    const isCorrect =
      (guess === "higher" && rightRating >= leftRating) ||
      (guess === "lower" && rightRating <= leftRating);

    if(isCorrect) {
      setScore((prev) => prev + 1);
      setGameState("ROUND_WIN");
    } else {
      setGameState("GAMEOVER");
    }
  };




  if(gameState === "LOADING") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-evergreen text-lime_cream">
        <div className="text-2xl font-bold">Finding Locations...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-row ">
      <div className="flex-1">
        <PlacePhoto photos={leftPlace.photos} altText={leftPlace.name}></PlacePhoto>
      </div>
      <div className="flex-1">
        <PlacePhoto photos={rightPlace.photos} altText={rightPlace.name}></PlacePhoto>
      </div>

    </div>
  );
}