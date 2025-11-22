// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCg9dt7Dn90unlUH7tFLt3WIkcv9LIRVQI",
  authDomain: "ratingguessr-v1-37586.firebaseapp.com",
  projectId: "ratingguessr-v1-37586",
  storageBucket: "ratingguessr-v1-37586.firebasestorage.app",
  messagingSenderId: "588102126784",
  appId: "1:588102126784:web:2c9fd7159376e63de6b125",
  measurementId: "G-F1ECLBRWYF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);