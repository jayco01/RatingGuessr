import { NextResponse } from "next/server";
import RAW_CHAIN_LIST from "@/app/lib/excludeChains.json"
import { supabaseAdmin } from "@/app/lib/supabase-server";

export const dynamic = 'force-dynamic';

// --- Configuration Constants ---
const CONFIG = {
  REVIEWS: { MIN: 50, MAX: 5000 },
  BATCH_SIZE: 5,
  POOL_SIZE: 40,
  MAX_API_ATTEMPTS: 10,
  SEARCH_RADIUS_METERS: 2000.0,
  MAX_JITTER_RADIUS_KM: 20,
  EARTH_RADIUS_KM: 111.32,
  SHORT_CHAIN_NAME: 11,
  CACHE_TTL_DAYS: 30,
  CACHE_GEO_RADIUS_DEG: 0.2, // ~22km bounding box for city match
};

// Prepare the "Chain" Places
const normalizeText = (text) => text?.toLowerCase().replace(/['.]/g, "");
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

  // --- Cache Lookup ---
  const cachedCandidates = await getCachedPlaces(anchorLat, anchorLng, seenIds);
  const cachedBatch = buildFinalBatch(randomizeListOrder(cachedCandidates));

  if (cachedBatch.length >= CONFIG.BATCH_SIZE) {
    console.log(`Cache hit: returning ${cachedBatch.length} places (0 Google calls)`);
    return NextResponse.json(cachedBatch);
  }

  console.log(`Cache miss: ${cachedCandidates.length} unseen cached places. Fetching from Google...`);

  // --- Google Fetch Loop ---
  const candidatePool = [];
  let googleNextPageToken = null;
  let apiCallCount = 0;
  let currentSearchCenter = { lat: Number(anchorLat), lng: Number(anchorLng) };
  let shouldJumpToNewLocation = true;

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
        shouldJumpToNewLocation = true;
        googleNextPageToken = null;
        continue;
      }

      const data = await response.json();
      const rawResults = data.places || [];

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

      if (data.nextPageToken) {
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

  // --- Cache Write ---
  if (candidatePool.length > 0) {
    cachePlaces(anchorLat, anchorLng, candidatePool); // fire-and-forget
  }

  // --- Post Processing ---
  const shuffledCandidates = randomizeListOrder(candidatePool);
  const finalBatch = buildFinalBatch(shuffledCandidates);

  return NextResponse.json(finalBatch);
}


//-------------------------------
// Cache Helpers
//-------------------------------

async function getCachedPlaces(lat, lng, seenIds) {
  try {
    const since = new Date(Date.now() - CONFIG.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const r = CONFIG.CACHE_GEO_RADIUS_DEG;

    const { data, error } = await supabaseAdmin
      .from("places_cache")
      .select("place_id, name, rating, user_rating_count, photos")
      .gte("city_lat", lat - r)
      .lte("city_lat", lat + r)
      .gte("city_lng", lng - r)
      .lte("city_lng", lng + r)
      .gt("cached_at", since);

    if (error || !data) return [];

    const seenSet = new Set(seenIds);
    return data
      .filter(p => !seenSet.has(p.place_id))
      .map(p => ({
        placeId: p.place_id,
        name: p.name,
        rating: Number(p.rating),
        userRatingCount: p.user_rating_count,
        photos: p.photos || []
      }));
  } catch {
    return [];
  }
}

async function cachePlaces(anchorLat, anchorLng, places) {
  try {
    const rows = places.map(p => ({
      place_id: p.placeId,
      name: p.name,
      rating: p.rating,
      user_rating_count: p.userRatingCount,
      photos: p.photos,
      city_lat: Number(anchorLat),
      city_lng: Number(anchorLng),
    }));

    const { error } = await supabaseAdmin
      .from("places_cache")
      .upsert(rows, { onConflict: "place_id" });

    if (error) console.error("Cache write error:", error.message);
    else console.log(`Cached ${rows.length} places to Supabase.`);
  } catch (err) {
    console.error("Cache write failed:", err);
  }
}


//-------------------------------
// Batch Builder
//-------------------------------

function buildFinalBatch(shuffledCandidates) {
  const finalBatch = [];
  let previousRating = null;

  for (const place of shuffledCandidates) {
    if (finalBatch.length >= CONFIG.BATCH_SIZE) break;

    const isRatingTooSimilar = previousRating !== null && Math.abs(place.rating - previousRating) < 0.1;

    if (!isRatingTooSimilar) {
      finalBatch.push(place);
      previousRating = place.rating;
    }
  }

  return finalBatch;
}


//-------------------------------
// Place Eligibility
//-------------------------------

function isPlaceEligible(place, currentPool, historyOfSeenIds) {
  const reviewCount = place.userRatingCount || 0;
  const hasPhotos = place.photos && place.photos.length > 0;
  const isAlreadyInPool = currentPool.some(p => p.placeId === place.id);
  const isInHistory = historyOfSeenIds.includes(place.id);

  const name = place.displayName?.text;
  const normalizedName = normalizeText(name);

  if (BLOCKED_CHAINS_SET.has(normalizedName)) {
    console.log(`${name} excluded: exact chain match`);
    return false;
  }

  const isChainVariation = RAW_CHAIN_LIST.some(chain => {
    const cleanChain = normalizeText(chain);
    if (cleanChain.length > CONFIG.SHORT_CHAIN_NAME) return false;
    return normalizedName.startsWith(cleanChain);
  });

  if (isChainVariation) {
    console.log(`${name} excluded: partial chain match`);
    return false;
  }

  if (!hasPhotos) return false;
  if (isAlreadyInPool) return false;
  if (isInHistory) return false;
  if (reviewCount < CONFIG.REVIEWS.MIN || reviewCount > CONFIG.REVIEWS.MAX) return false;

  return true;
}


//-------------------------------
// Location Helpers
//-------------------------------

function calculateJitteredLocation(anchorLat, anchorLng, maxRadiusKm) {
  const randomDistanceKm = maxRadiusKm * Math.sqrt(Math.random());
  const randomAngleRadians = Math.random() * 2 * Math.PI;

  const kilometersNorth = randomDistanceKm * Math.cos(randomAngleRadians);
  const kilometersEast = randomDistanceKm * Math.sin(randomAngleRadians);

  const latitudeOffsetDegrees = kilometersNorth / CONFIG.EARTH_RADIUS_KM;
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

function randomizeListOrder(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
