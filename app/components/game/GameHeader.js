"use client";

import { FaSignOutAlt, FaHeart } from "react-icons/fa";
import Link from "next/link";

export default function GameHeader({ currentCity, user, onClearCity, onLogout, onLogin }) {
  return (
    <>
      {/* Top Left: City Controls */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <div className="bg-black/50 text-white px-4 py-3 font-semibold rounded-full text-sm backdrop-blur-sm border border-white/10 shadow-sm">
          📍 {currentCity?.name}
        </div>
        <button
          onClick={onClearCity}
          className="bg-white/20 hover:bg-lime-700 hover:text-white text-white/80 text-sm font-semibold px-4 py-3 rounded-full backdrop-blur-sm transition border border-white/10"
        >
          Change City
        </button>
      </div>

        {/* Top Right: User Profile */}
        <div className="absolute top-4 right-4 z-50 flex flex-row gap-2">
          {user && (
            <Link
              href="/favorites"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-full backdrop-blur-sm transition flex items-center justify-center border border-white/10"
              title="My Favorites"
            >
              Go to Favorites
              <FaHeart className="text-red-400 ml-2" />
            </Link>
          )}
          {user ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-black/50 text-white font-semibold px-4 py-2 rounded-full backdrop-blur-sm hover:bg-red-900/80 transition text-sm border border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-hunter_green flex items-center justify-center text-xs overflow-hidden">
                {/* Fallback avatar logic */}
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  user.email?.[0]?.toUpperCase()
                )}
              </div>
              <span className="hidden md:inline">Sign Out</span>
              <FaSignOutAlt />
            </button>
        ) : (
          <button
            onClick={onLogin}
            className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-sm shadow-xl"
          >
            Login
          </button>
        )}

      </div>
    </>
  );
}