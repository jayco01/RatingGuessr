"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/app/hooks/useAuth";
import { FaArrowLeft, FaMapMarkerAlt, FaStar, FaTrash, FaExternalLinkAlt } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const {user, loading: authLoading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");//Send back to the game if user is not logged in
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if(!user) return;
    const q = query(
      collection(db, "users", user.uid, "favorites"),
      orderBy("savedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFavorites(favs);
      setLoading(false);
    });
    return () => unsubscribe();

  }, [user]);

  const handleDelete = async (placeId) => {
    if(!confirm("Remove this place from favorites?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", placeId));
      toast.success("Removed from favorites.");
    } catch (error) {
      toast.error("Could not delete item");
    }
  };
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-evergreen flex items-center justify-center text-lime_cream">
        <div className="animate-pulse text-2xl font-bold">Loading Favorites...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-evergreen-200 p-8">
      <Toaster position="bottom-center" />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition"
        >
          <FaArrowLeft />
        </button>
        <h1 className="text-4xl font-bold text-lime_cream">Your Saved Spots</h1>
      </div>

      {/* Grid Layout */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {favorites.length === 0 && (
          <div className="col-span-full text-center text-white/50 py-20">
            <p className="text-xl">No favorites yet. Go play the game to find some!</p>
          </div>
        )}

        {favorites.map((place) => (
          <div key={place.id} className="bg-white rounded-xl overflow-hidden shadow-xl flex flex-col group">

            {/* Image Banner */}
            <div className="h-48 bg-gray-200 relative overflow-hidden">
              {place.photoName ? (
                <img
                  src={`https://places.googleapis.com/v1/${place.photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`}
                  alt={place.name}
                  className="w-full h-full object-cover transition transform group-hover:scale-105 duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
              )}

              {/* Rating Badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-lime_cream px-2 py-1 rounded-md flex items-center gap-1 text-sm font-bold backdrop-blur-sm">
                <FaStar className="text-yellow-400" /> {place.rating?.toFixed(1)}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-800 mb-1">{place.name}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                <FaMapMarkerAlt className="text-red-500" /> {place.city}
              </p>

              <div className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                {place.address}
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                <a
                  href={place.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-hunter_green hover:bg-evergreen text-white py-2 rounded-lg text-center text-sm font-semibold flex items-center justify-center gap-2 transition"
                >
                  <FaExternalLinkAlt size={12} /> Open Maps
                </a>
                <button
                  onClick={() => handleDelete(place.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

}