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

  const handleEmailAuth = async event => {
    event.preventDefault();
    setError("");

    try {
      if (isSignUp) {
        // Create a new account
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // login to an existing account
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();// close login model once done logging in
    } catch (error) {
      setError(error.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in duration-200">

        {/* Close Button (Top Right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black transition"
        >
          <FaTimes size={20} />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            {isSignUp
              ? "Join to save your favorite spots and track stats."
              : "Log in to access your favorites."}
          </p>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition mb-4 shadow-sm"
          >
            <FaGoogle className="text-red-500" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-black transition"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-black transition"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-hunter_green hover:bg-evergreen text-white font-bold py-2.5 rounded-lg transition shadow-md"
            >
              {isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>

          {/* Toggle between Sign Up and Log In */}
          <p className="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(""); // Clear errors when switching modes
              }}
              className="ml-1 text-green-700 font-bold hover:underline"
            >
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )

}