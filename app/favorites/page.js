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
  const [loading, setLoading] = useState(false);
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
      collection(db, "user", user.id, "favorites"),
      orderBy("saveAt", "desc")
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

}