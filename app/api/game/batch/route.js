import { NextResponse } from "next/server";

// Force dynamic to ensure the server doesn't cache the API response
export const dynamic = 'force-dynamic';

const MIN_REVIEWS = 50;
const MAX_REVIEWS = 5000;
const TARGET_BATCH_SIZE = 10;
const FETCH_POOL_SIZE = 40;
const MAX_ATTEMPTS = 5;
const SEARCH_RADIUS = 20000.0;

// Shuffle Algorithm to randomize the order of batch
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Adds a small random offset (~1-2km) to prevent identical API calls
function addJitter(coordinate) {
  const jitterAmount = (Math.random() - 0.5) * 0.02;
  return coordinate + jitterAmount;
}

export async function POST(request) {
  console.log("----- API REQUEST STARTED: /api/game/batch -----");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let { lat, lng, category, seenIds = [] } = body;
  lat = addJitter(lat);
  lng = addJitter(lng);

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.location",
      "places.rating",
      "places.userRatingCount",
      "places.primaryType",
      "places.photos"
    ].join(",");

    let candidates = [];
    let nextPageToken = null;
    let attempts = 0;

    // fetch until there is enough candidates to shuffle, or we run out of pages
    do {
      attempts++;

      const requestBody = {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS
          }
        },
        includedPrimaryTypes: [category],
        maxResultCount: 20,
        ...(nextPageToken && { pageToken: nextPageToken })
      };

      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API Error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
      const rawPlaces = data.places || [];
      nextPageToken = data.nextPageToken;

      // Filter Logic
      const potentialPlaces = rawPlaces.filter(place => {
        const reviewCount = place.userRatingCount || 0;
        const hasPhotos = place.photos && place.photos.length > 0;

        const isDuplicate = candidates.some(p => p.placeId === place.id);

        const isSeen = seenIds.includes(place.id);

        return !isDuplicate && !isSeen && hasPhotos && reviewCount >= MIN_REVIEWS && reviewCount <= MAX_REVIEWS;
      });

      for (const place of potentialPlaces) {
        const photoCollection = place.photos.slice(0, 10).map(photo => ({
          name: photo.name,
          attributions: photo.authorAttributions
        }));

        candidates.push({
          placeId: place.id,
          name: place.displayName.text,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          photos: photoCollection
        });
      }

      // Stop if no next page is available
      if (!nextPageToken) break;

      // Continue fetching until we have a enough in the pool (40 items) or hit max attempts
    } while (candidates.length < FETCH_POOL_SIZE && attempts < MAX_ATTEMPTS);

    const shuffledCandidates = shuffleArray(candidates);

    let validBatch = [];
    let lastRating = null;

    for (const place of shuffledCandidates) {
      if (validBatch.length >= TARGET_BATCH_SIZE) break;

      //No-Tie Check
      const isTie = lastRating !== null && Math.abs(place.rating - lastRating) < 0.1;

      if (!isTie) {
        validBatch.push(place);
        lastRating = place.rating;
      }
    }

    return NextResponse.json(validBatch);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}