"use client"

import StreetView from "../components/game/StreetView";

export default function GamePage() {
  const lat = 31.803794369102626;
  const lng = 131.4645415903876;
  return (
    <div className="w-full h-screen">
      <StreetView lat={lat} lng={lng} />
    </div>
  )
}