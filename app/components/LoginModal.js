"use client";

import {useState} from "react";
import {getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "firebase/auth";
import {app} from "@/app/lib/firebase";
import {FaGoogle, FaTimes} from "react-icons/fa";

export default function LoginModal({isOpen, onClose}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if(!isOpen) return null;

  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  const handleGoogleLogin = async() => {
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };



}