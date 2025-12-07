"use client"

import {useState, useEffect, useCallback} from "react";
import PlacePhoto from "@/app/components/game/PlacePhoto";
import {FaArrowUp, FaArrowDown, FaStar, FaRedo, FaArrowRight, FaHeart, FaSignOutAlt} from "react-icons/fa";
import CityPicker from "@/app/components/CityPicker";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/app/lib/firebase";
import { useAuth } from "@/app/hooks/useAuth";
import LoginModal from "@/app/components/LoginModal";

// Sub-Components
import LobbyView from "@/app/components/game/LobbyView";
import GameHeader from "@/app/components/game/GameHeader";
import ScoreBoard from "@/app/components/game/ScoreBoard";
import LeftCard from "@/app/components/game/LeftCard";
import RightCard from "@/app/components/game/RightCard";

// Read from LocalStorage to avoids "window is undefined" error
const loadState = (key, fallback) => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback; // JSON.parse handles both numbers (score) and objects (queue)
  }
  return fallback;
};

export default function GamePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentCity, setCurrentCity] = useState(() => loadState("rg_city", null));

  // Auth States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuth();

  // STATES: LOADING -> PLAYING -> ROUND_WIN -> GAMEOVER
  const [gameState, setGameState] = useState("LOADING");
  const [score, setScore] = useState(() => loadState("rg_score", 0));

  // The two cards currently on the "Board"
  const [leftPlace, setLeftPlace] = useState(() => loadState("rg_left", null));
  const [rightPlace, setRightPlace] = useState(() => loadState("rg_right", null));

  // The Queue (Buffer)
  const [placeQueue, setPlaceQueue] = useState(() => loadState("rg_queue", []));

  const [seenIds, setSeenIds] = useState(() => loadState("rg_seen", []));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save states to local storage whenever one of them updates
  useEffect(() => {
    localStorage.setItem("rg_score", JSON.stringify(score));
    localStorage.setItem("rg_left", JSON.stringify(leftPlace));
    localStorage.setItem("rg_right", JSON.stringify(rightPlace));
    localStorage.setItem("rg_queue", JSON.stringify(placeQueue));
    localStorage.setItem("rg_city", JSON.stringify(currentCity));
    localStorage.setItem("rg_seen", JSON.stringify(seenIds));
  }, [score, leftPlace, rightPlace, placeQueue, currentCity]); // Add dependency

  const fetchBatch = useCallback(async (cityOverride) => {
    const targetCity = cityOverride || currentCity;

    if (!targetCity) return [];

    try {
      const response = await fetch("/api/game/batch", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          lat: targetCity.lat,
          lng: targetCity.lng,
          category: "restaurant",
          seenIds: seenIds
        }),
      });
      const newBatch = await response.json();

      // update seen IDs with the new items
      if(newBatch && newBatch.length > 0) {
        const newIds = newBatch.map(p => p.placeId);
        setSeenIds(prev => [...prev, ...newIds]);
      }

      return newBatch;
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [currentCity, seenIds]);

  const handleCitySelect = async (cityData) => {
    console.log("Selected City:", cityData);
    setCurrentCity(cityData);
    setGameState("LOADING");

    // Reset the queues for the new city
    setLeftPlace(null);
    setRightPlace(null);
    setPlaceQueue([]);
    setSeenIds([]);

    localStorage.removeItem("rg_left");
    localStorage.removeItem("rg_right");
    localStorage.removeItem("rg_queue");
    localStorage.removeItem("rg_seen");

    //fetch new batch for the new city
    const batch = await fetchBatch(cityData);

    if (batch.length >= 2) {
      setLeftPlace(batch[0]);
      setRightPlace(batch[1]);
      setPlaceQueue(batch.slice(2));
      setGameState("PLAYING");
    }
  };

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
  }, [fetchBatch, currentCity])


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

  const handleFavorite = () => {
    if (!user) {
      setShowLoginModal(true); // Open modal if guest
    } else {
      console.log("Saving favorite for user:", user.uid);
      // todo: implement firestore logic to save favorites
    }
  };

  const handleLogout = () => {
    const auth = getAuth(app);
    signOut(auth);
  };


  const resetGame = () => {
    localStorage.removeItem("rg_score");
    localStorage.removeItem("rg_left");
    localStorage.removeItem("rg_right");
    localStorage.removeItem("rg_queue");

    window.location.reload();
  };

  const clearCity = () => {
    localStorage.removeItem("rg_city");
    localStorage.removeItem("rg_score");
    localStorage.removeItem("rg_left");
    localStorage.removeItem("rg_right");
    localStorage.removeItem("rg_queue");
    localStorage.removeItem("rg_seen");
    window.location.reload();
  };

  if (!isMounted) return null;

  if (!currentCity) {
    return (
      <LobbyView onCitySelect={handleCitySelect} />
    );
  }

  if(gameState === "LOADING" || !leftPlace || !rightPlace) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-evergreen text-lime_cream">
        <div className="text-2xl font-bold animate-pulse">Finding Locations in {currentCity.name}...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative">
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <GameHeader
        currentCity={currentCity}
        user={user}
        onClearCity={clearCity}
        onLogout={handleLogout}
        onLogin={() => setShowLoginModal(true)}
      />

      <ScoreBoard score={score} />

      <div className="flex w-full h-full">
        <LeftCard place={leftPlace} onFavorite={handleFavorite} />
        <RightCard
          place={rightPlace}
          gameState={gameState}
          onGuess={handleGuess}
          onNext={handleNextRound}
          onReset={resetGame}
        />
      </div>
    </div>
  );
}
