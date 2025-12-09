import { NextResponse } from "next/server";
import RAW_CHAIN_LIST from "@/app/lib/excludeChains.json"

export const dynamic = 'force-dynamic';

// --- Configuration Constants ---
const CONFIG = {
  REVIEWS: { MIN: 50, MAX: 5000 },
  BATCH_SIZE: 5,
  POOL_SIZE: 40,
  MAX_API_ATTEMPTS: 10,
  SEARCH_RADIUS_METERS: 2000.0,
  MAX_JITTER_RADIUS_KM: 20,
  EARTH_RADIUS_KM: 111.32, // Approximate km per degree of latitude
  SHORT_CHAIN_NAME: 10
};

// Prepare the "Chain" Places
const normalizeText = (text) => text?.toLowerCase().replace(/['.]/g, ""); //remove punctuations
const BLOCKED_CHAINS_SET = new Set(RAW_CHAIN_LIST.map(name => normalizeText(name)));

// --- Main Route Handler ---
export async function POST(request) {
  console.log("----- API: Batch Fetch Started -----");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lat: anchorLat, lng: anchorLng, category, seenIds = [] } = body;
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!apiKey) return NextResponse.json({ error: "Server Config Error" }, { status: 500 });

  const candidatePool = [];
  let googleNextPageToken = null;
  let apiCallCount = 0;
  let currentSearchCenter = { lat: Number(anchorLat), lng: Number(anchorLng) };
  let shouldJumpToNewLocation = true;

  // --- Fetch Loop ---
  do {
    apiCallCount++;

    if (shouldJumpToNewLocation) {
      currentSearchCenter = calculateJitteredLocation(
        Number(anchorLat),
        Number(anchorLng),
        CONFIG.MAX_JITTER_RADIUS_KM
      );
      shouldJumpToNewLocation = false;
    }

    // Prepare Google Request
    const googlePayload = {
      locationRestriction: {
        circle: {
          center: {
            latitude: currentSearchCenter.lat,
            longitude: currentSearchCenter.lng
          },
          radius: CONFIG.SEARCH_RADIUS_METERS
        }
      },
      includedPrimaryTypes: [category],
      maxResultCount: 20,
      ...(googleNextPageToken && { pageToken: googleNextPageToken })
    };

    console.log(`Fetching Page ${apiCallCount}...`);

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.photos'
        },
        body: JSON.stringify(googlePayload)
      });

      if (!response.ok) {
        console.error(`Google API Error: ${response.status}`);
        shouldJumpToNewLocation = true; // Try a new spot if this one fails
        googleNextPageToken = null;
        continue;
      }

      const data = await response.json();
      const rawResults = data.places || [];

      // Filter out Invalidate Places
      const validPlaces = rawResults.filter(place => isPlaceEligible(place, candidatePool, seenIds));

      validPlaces.forEach(place => {
        candidatePool.push({
          placeId: place.id,
          name: place.displayName.text,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          photos: place.photos.slice(0, 10).map(p => ({ name: p.name, attributions: p.authorAttributions }))
        });
      });

      console.log(`Added ${validPlaces.length} valid places. Pool Size: ${candidatePool.length}`);

      if (data.nextPageToken) { // is there is a next page then keep using the current coordinates
        googleNextPageToken = data.nextPageToken;
      } else {
        console.log("Location exhausted. Triggering Jump.");
        googleNextPageToken = null;
        shouldJumpToNewLocation = true;
      }

    } catch (err) {
      console.error("Fetch Exception:", err);
      break;
    }

  } while (candidatePool.length < CONFIG.POOL_SIZE && apiCallCount < CONFIG.MAX_API_ATTEMPTS);

  // --- Post Processing ---
  const shuffledCandidates = randomizeListOrder(candidatePool);
  const finalBatch = [];
  let previousRating = null;

  // Tie-Breaker Logic: Ensure no two consecutive places have very similar ratings
  for (const place of shuffledCandidates) {
    if (finalBatch.length >= CONFIG.BATCH_SIZE) break;

    const isRatingTooSimilar = previousRating !== null && Math.abs(place.rating - previousRating) < 0.1;

    if (!isRatingTooSimilar) {
      finalBatch.push(place);
      previousRating = place.rating;
    }
  }

  return NextResponse.json(finalBatch);
}


//-------------------------------
// Helper Functions
//-------------------------------


function isPlaceEligible(place, currentPool, historyOfSeenIds) {
  const reviewCount = place.userRatingCount || 0;
  const hasPhotos = place.photos && place.photos.length > 0;
  const isAlreadyInPool = currentPool.some(p => p.placeId === place.id);
  const isInHistory = historyOfSeenIds.includes(place.id);

  const name = place.displayName?.text;
  const normalizedName = normalizeText(name)

  // exact match check of a "chain"
  if (BLOCKED_CHAINS_SET.has(normalizedName)) {
    console.log(`${name} not included to fetched list because it is an exact match of a "chain' place`)
    return false
  }

  // Partial match check: check if the place name 'starts with' any of our blocked chains
  const isChainVariation = RAW_CHAIN_LIST.some(chain => {
    const cleanChain = normalizeText(chain);

    // if  the chain name is short then only filter out exact matches
    if (cleanChain.length > CONFIG.SHORT_CHAIN_NAME) return false;

    // only filtering out places that start with a chain name since most "chains" chain have their name first before location or branch name
    return normalizedName.startsWith(cleanChain);
  });

  if (isChainVariation) {
    console.log(`${name} not included to fetched list because it is a partial match of a "chain' place`);
    return false;
  }

  if (!hasPhotos) return false;
  if (isAlreadyInPool) return false;
  if (isInHistory) return false;
  if (reviewCount < CONFIG.REVIEWS.MIN || reviewCount > CONFIG.REVIEWS.MAX) return false;

  return true;
}

/**
 * Calculates a new random coordinate within a circular area.
 * Uses Polar Coordinates to ensure uniform distribution.
 */
function calculateJitteredLocation(anchorLat, anchorLng, maxRadiusKm) {

  // Generate random polar coordinates
  // sqrt(random) to prevent clustering at the center of the circle
  const randomDistanceKm = maxRadiusKm * Math.sqrt(Math.random());
  const randomAngleRadians = Math.random() * 2 * Math.PI;

  // Convert Polar (distance/angle) to Cartesian offsets (km)
  const kilometersNorth = randomDistanceKm * Math.cos(randomAngleRadians);
  const kilometersEast = randomDistanceKm * Math.sin(randomAngleRadians);

  // Convert km offsets to coordinate degrees
  const latitudeOffsetDegrees = kilometersNorth / CONFIG.EARTH_RADIUS_KM;

  // Longitude lines shrink as we move away from the equator, so we adjust by cos(lat)
  const longitudeScaler = Math.cos(anchorLat * (Math.PI / 180));
  const longitudeOffsetDegrees = kilometersEast / (CONFIG.EARTH_RADIUS_KM * longitudeScaler);

  const newLocation = {
    lat: anchorLat + latitudeOffsetDegrees,
    lng: anchorLng + longitudeOffsetDegrees,
    distanceFromAnchor: randomDistanceKm
  };

  console.log(`Jittered ${newLocation.distanceFromAnchor.toFixed(2)}km to new center.`);
  return newLocation;
}

// Randomize the order of places in the validated list of places
// This hopefully makes the game feel less repetitive if a person lives in a small city with limited options of "places"
function randomizeListOrder(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}