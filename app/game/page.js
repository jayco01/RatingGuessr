"use client"

import {useState, useEffect, useCallback} from "react";
import PlacePhoto from "@/app/components/game/PlacePhoto";
import {FaArrowUp, FaArrowDown, FaStar, FaRedo, FaArrowRight} from "react-icons/fa";

// Read from LocalStorage to avoids "window is undefined" error
const loadState = (key, fallback) => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback; // JSON.parse handles both numbers (score) and objects (queue)
  }
  return fallback;
};

export default function GamePage() {
  // STATES: LOADING -> PLAYING -> ROUND_WIN -> GAMEOVER
  const [gameState, setGameState] = useState("LOADING");
  const [score, setScore] = useState(() => loadState("rg_score", 0));

  // The two cards currently on the "Board"
  const [leftPlace, setLeftPlace] = useState(() => loadState("rg_left", null));
  const [rightPlace, setRightPlace] = useState(() => loadState("rg_right", null));

  // The Queue (Buffer)
  const [placeQueue, setPlaceQueue] = useState(() => loadState("rg_queue", []));

  // Save states to local storage whenever one of them updates
  useEffect(() => {
    localStorage.setItem("rg_score", JSON.stringify(score));
    localStorage.setItem("rg_left", JSON.stringify(leftPlace));
    localStorage.setItem("rg_right", JSON.stringify(rightPlace));
    localStorage.setItem("rg_queue", JSON.stringify(placeQueue));
  }, [score, leftPlace, rightPlace, placeQueue]);

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
      // If a game was restored from local storage, resume it instead of fetching new
      if (leftPlace && rightPlace) {
        setGameState("PLAYING");
        return;
      }

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

  const handleNextRound = async () => {
    setLeftPlace(rightPlace);

    if(placeQueue.length > 0) {
      const next = placeQueue[0];
      setRightPlace(next);
      setPlaceQueue(prev => prev.slice(1)); // Shift queue

      // Background fetch to keep queue full
      if(placeQueue.length < 3) {
        const newBatch = await fetchBatch();

        setPlaceQueue(prevQueue => {
          // If queue is empty, just take the new batch
          if (prevQueue.length === 0) return newBatch;

          const lastItem = prevQueue[prevQueue.length - 1]; //last item in the current queue
          const firstNew = newBatch[0]; //First item of new data

          // Tie-Breaker Check
          if (lastItem && firstNew && lastItem.rating === firstNew.rating) {
            console.log("Batch boundary tie detected! Dropping duplicate rating to preserve game flow.");
            // Return existing queue + new batch (minus the first item)
            return [...prevQueue, ...newBatch.slice(1)];
          }

          // merge after checking the tie
          return [...prevQueue, ...newBatch];
        });
      }

      setGameState("PLAYING");
    } else {
      setGameState("LOADING");
    }
  };

  const resetGame = () => {
    localStorage.removeItem("rg_score");
    localStorage.removeItem("rg_left");
    localStorage.removeItem("rg_right");
    localStorage.removeItem("rg_queue");

    window.location.reload();
  };

  if(gameState === "LOADING") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-evergreen text-lime_cream">
        <div className="text-2xl font-bold">Finding Locations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative">

      {/* --- LEFT CARD --- */}
      <div className="relative w-1/2 h-full border-r-4 border-white">
        <PlacePhoto photos={leftPlace.photos} altText={leftPlace.name} />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-white mb-2">{leftPlace.name}</h2>
          <div className="text-5xl font-extrabold text-lime_cream">
            {leftPlace.rating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-300 mt-2">Google Rating</div>
        </div>
      </div>

      {/* --- RIGHT CARD --- */}
      <div className="relative w-1/2 h-full">
        <PlacePhoto photos={rightPlace.photos} altText={rightPlace.name} />

        {/* Overlay: Playing State */}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-white mb-6">{rightPlace.name}</h2>

          {gameState === "PLAYING" ? (
            <div className="flex flex-col gap-4">
              <div className="text-xl text-white">has a rating...</div>

              <button
                onClick={() => handleGuess("higher")}
                className="flex items-center gap-2 bg-hunter_green hover:bg-evergreen text-white px-8 py-3 rounded-full text-xl font-bold transition transform hover:scale-105"
              >
                <FaArrowUp /> Higher
              </button>

              <button
                onClick={() => handleGuess("lower")}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-800 text-white px-8 py-3 rounded-full text-xl font-bold transition transform hover:scale-105"
              >
                <FaArrowDown /> Lower
              </button>

              <div className="text-xl text-white">than {leftPlace.name}?</div>
            </div>
          ) : (
            /* Overlay: Result State (Win/Loss) */
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="text-6xl font-extrabold text-lime_cream mb-2">
                {rightPlace.rating.toFixed(1)}
              </div>

              {gameState === "ROUND_WIN" && (
                <div className="mb-6">
                  <div className="text-2xl text-green-400 font-bold mb-4">Correct!</div>
                  <button
                    onClick={handleNextRound}
                    className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200"
                  >
                    Next Round <FaArrowRight />
                  </button>
                </div>
              )}

              {gameState === "GAMEOVER" && (
                <div className="mb-6">
                  <div className="text-2xl text-red-500 font-bold mb-4">Game Over!</div>
                  <button
                    onClick={resetGame}
                    className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200"
                  >
                    Play Again <FaRedo />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- SCOREBOARD --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 text-white font-mono text-xl z-50">
        Score: {score}
      </div>

    </div>
  );
}