"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/hooks/useAuth";
import LoginModal from "@/app/components/LoginModal";
import { Toaster, toast } from "react-hot-toast";


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
  const BUFFER_UNDERRUN_SIZE = 2;
  const FETCH_TIMEOUT_MS = 5000; // how long should fetch batch take before allowing duplicate places to be added in queue
  const isGuessing = useRef(false);
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

  const [seenIds, setSeenIds] = useState(() => {
    if (typeof window !== "undefined") {
      const lastPlayedStr = localStorage.getItem("rg_last_played");

      const DAY_PASSED = 1;
      const CALCULATED_RESET_TIME = DAY_PASSED * 24 * 60 * 60 * 1000;

      const now = Date.now();

      if (lastPlayedStr) {
        const lastPlayed = parseInt(lastPlayedStr);
        // Check if more than 1 day has passed
        if (now - lastPlayed > CALCULATED_RESET_TIME) {
          console.log("It's been over "+ DAY_PASSED +" day(s). Resetting seen history.");
          return [];
        }
      }
      return loadState("rg_seen", []);
    }
    return [];
  });

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
    localStorage.setItem("rg_last_played", Date.now().toString());
  }, [score, leftPlace, rightPlace, placeQueue, currentCity, seenIds]); // Add dependency

  const fetchBatch = useCallback(async (cityOverride, customSeenIds = null) => {
    const targetCity = cityOverride || currentCity;
    const idsToUse = customSeenIds || seenIds;

    if (!targetCity) return [];

    try {
      const response = await fetch("/api/game/batch", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          lat: targetCity.lat,
          lng: targetCity.lng,
          category: "restaurant",
          seenIds: idsToUse
        }),
      });

      if (!response.ok) {
        console.error(`HTTP Error! status: ${response.status}`);
      }

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

    let batch = [];

    try {
      // Define the Promise when it time out
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), FETCH_TIMEOUT_MS)
      );

      batch = await Promise.race([
        fetchBatch(cityData),
        timeoutPromise
      ]);

    } catch (err) {
      if (err.message === "TIMEOUT") {
        // Clear History and retry if fetching takes over the FETCH_TIMEOUT_MS window
        localStorage.removeItem("rg_seen");
        setSeenIds([]);

        batch = await fetchBatch(cityData, []);
      } else {
        console.error("Fetch failed:", err);
      }
    }

    if (batch && batch.length >= 2) {
      setLeftPlace(batch[0]);
      setRightPlace(batch[1]);
      setPlaceQueue(batch.slice(2));
      setGameState("PLAYING");
    } else {
      console.error("Not enough places found!");
      setGameState("LOBBY");
      setCurrentCity(null);
      alert("Not enough places found in " + cityData.name);
    }
  };

  useEffect(() => {
    const initGame = async () => {
      // If a game was restored from local storage, resume it instead of fetching new
      if (leftPlace && rightPlace) {
        setGameState("PLAYING");
        return;
      }

      // Only auto-fetch on mount when there's a saved city but no saved places.
      // New city selections are handled entirely by handleCitySelect.
      const batch = await fetchBatch();
      if (batch.length >= 2) {
        setLeftPlace(batch[0]);
        setRightPlace(batch[1]);
        setPlaceQueue(batch.slice(2));
        setGameState("PLAYING");
      }
    };
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run only on mount — handleCitySelect owns all subsequent fetches


  const handleGuess = (guess) => {
    if (gameState !== "PLAYING" || isGuessing.current) return;
    isGuessing.current = true;

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
    isGuessing.current = false;

    const nextPlace = placeQueue[0];

    // Skip any place that would create an unguessable round
    const effectiveNext = (() => {
      if (!nextPlace) return null;
      const newLeft = rightPlace;
      if (newLeft && Math.abs(nextPlace.rating - newLeft.rating) < 0.1) {
        return placeQueue[1] ?? null;
      }
      return nextPlace;
    })();

    if (effectiveNext) {
      const skipped = effectiveNext === placeQueue[1] ? 1 : 0;
      setGameState("PLAYING");
      setLeftPlace(rightPlace);
      setRightPlace(effectiveNext);
      setPlaceQueue(prev => prev.slice(1 + skipped));

      if (placeQueue.length - skipped < BUFFER_UNDERRUN_SIZE) {
        const newBatch = await fetchBatch();
        setPlaceQueue(prevQueue => {
          if (prevQueue.length === 0) return newBatch;

          const lastItem = prevQueue[prevQueue.length - 1];
          const firstNew = newBatch[0];

          if (lastItem && firstNew && Math.abs(lastItem.rating - firstNew.rating) < 0.1) {
            return [...prevQueue, ...newBatch.slice(1)];
          }
          return [...prevQueue, ...newBatch];
        });
      }
    } else {
      setGameState("LOADING");
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!leftPlace) return;

    const toastId = toast.loading("Saving location...");

    try {
      const response = await fetch(`/api/place/details?placeId=${leftPlace.placeId}`);
      const details = await response.json();

      const { error } = await supabase.from("favorites").upsert({
        user_id: user.id,
        place_id: leftPlace.placeId,
        name: leftPlace.name,
        rating: leftPlace.rating,
        photo_name: leftPlace.photos?.[0]?.name ?? null,
        address: details.formattedAddress || "Address not available",
        google_maps_uri: details.googleMapsUri ?? null,
        city: currentCity.name,
      });

      if (error) throw error;

      toast.success("Saved to favorites!", { id: toastId });

    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save location.", { id: toastId });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };


  const resetGame = () => {
    isGuessing.current = false;
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
      <Toaster position="bottom-center" toastOptions={{ style: { minWidth: '250px' } }} />

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <GameHeader
        currentCity={currentCity}
        user={user}
        onClearCity={clearCity}
        onLogout={handleLogout}
        onLogin={() => setShowLoginModal(true)}
      />

      <ScoreBoard score={score} />

      <div className="flex w-full h-full flex-col md:flex-row">
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
