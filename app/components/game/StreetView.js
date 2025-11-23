"use client"

import {useRef, useEffect} from "react";
import  { setOptions, importLibrary } from "@googlemaps/js-api-loader"

setOptions({
  key: process.env.NEXT_PUBLIC_MAPS_API_KEY,
  v: "weekly"
})

export default function StreetView( {lat, lng} ) {
  const streetViewRef = useRef(null);

  useEffect(() => {
    async function loadStreetView() {
      try {
        const {StreetViewPanorama} = await importLibrary("streetView");
        const panorama = new StreetViewPanorama(streetViewRef.current, {
          position: { lat, lng },
          pov: { heading: 0, pitch: 0 }, // heading needs to be upgraded in the future because this will currently not face the "place". "heading: 0" just means camera is facing north
          zoom: 1,
          disableDefaultUI: true,
          showRoadLabels: false,
          visible: true,
        });
      } catch (error) {
        console.error("Google Maps Panorama Loading Error: ", error);
      }
    }

    loadStreetView();
  }, [lat, lng]);

  return <div ref={streetViewRef} className="w-full h-full"/>
}
