# **Rating Guessr**

**Rating Guessr** is a "Higher or Lower" style web game that uses real-world data from the Google Maps API. Players choose a city and must guess if a specific restaurant has a higher or lower Google rating than the previous one.

The application features a robust anti-duplicate algorithm, user authentication for saving favorite spots, and a responsive design built with Next.js and Tailwind CSS.

![RatingGuessr Website](public/ratinggussr-screenshot.png)

## **Key Features**

* Search and play in any city supported by Google Maps (Tokyo, New York, Calgary, etc.).
* A custom server-side algorithm that "jitters" coordinates to find fresh places when a specific neighborhood runs dry, ensuring infinite gameplay without duplicates.
* Automatically filters out major global chains (McDonald's, Starbucks) to focus on local gems.
* Full Authentication (Google & Email/Password) via Firebase.
* Authenticated users can "Heart" locations to save them to their personal dashboard.
* Fully mobile-optimized interface with smooth animations and transitions.

## **Tech Stack**

### **Frontend**

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
* **Language:** JavaScript (ES6+)
* **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
* **Icons:** React Icons (FontAwesome & Lucide)
* **Notifications:** React Hot Toast

### **Backend & Services**

* **Serverless Functions:** Next.js API Routes (/api/\*)
* **Database:** [Firebase Firestore](https://firebase.google.com/products/firestore) (NoSQL)
* **Auth:** Firebase Authentication
* **Data Source:** Google Places API (New) & Maps JavaScript API

## **Hunter-Gatherer Algorithm**

Located in app/api/game/batch/route.js.  
Instead of a simple database query, the app actively "hunts" for data.

1. It searches a 2km radius around a central point (Anchor).
2. It filters results against a **Set O(1)** of excluded chains and a history of seenIds.
3. **Polar Jittering:** If the current area is exhausted (no new places found), the algorithm calculates a new search center using randomized Polar Coordinates, converted to Cartesian offsets. This ensures the API naturally searches around a city to find new content.