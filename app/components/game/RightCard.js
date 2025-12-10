"use client";

import PlacePhoto from "@/app/components/game/PlacePhoto";
import { FaArrowUp, FaArrowDown, FaRedo, FaArrowRight } from "react-icons/fa";

export default function RightCard({ place, gameState, onGuess, onNext, onReset }) {
  return (
    <div className="relative md:w-1/2 md:h-full h-1/2">
      <PlacePhoto photos={place?.photos} altText={place?.name} />

      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-3xl font-bold text-white mb-6">{place?.name}</h2>

        {/* State: PLAYING */}
        {gameState === "PLAYING" ? (
          <div className="flex flex-col gap-4 items-center">
            <p className="text-xl text-white">has a rating...</p>

            <button
              onClick={() => onGuess("higher")}
              className="flex items-center gap-2 bg-hunter_green hover:bg-evergreen text-white px-8 py-3 rounded-full text-xl font-bold transition transform hover:scale-105"
            >
              <FaArrowUp/> Higher
            </button>

            <button
              onClick={() => onGuess("lower")}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-800 text-white px-8 py-3 rounded-full text-xl font-bold transition transform hover:scale-105"
            >
              <FaArrowDown/> Lower
            </button>

            <p className="text-xl text-white">than the other place?</p>
          </div>
        ) : (
          /* State: RESULT (Win/Loss) */
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <p className="text-6xl font-extrabold text-lime_cream mb-2">
              {place?.rating ? place.rating.toFixed(1) : "N/A"}
            </p>

            {gameState === "ROUND_WIN" && (
              <div className="mb-6">
                <p className="text-2xl text-green-400 font-bold mb-4">Correct!</p>
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200"
                >
                  Next Round <FaArrowRight/>
                </button>
              </div>
            )}

            {gameState === "GAMEOVER" && (
              <div className="mb-6">
                <p className="text-2xl text-red-500 font-bold mb-4">Game Over!</p>
                <button
                  onClick={onReset}
                  className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200"
                >
                  Play Again <FaRedo/>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}