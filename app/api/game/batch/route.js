import { NextResponse } from "next/server";

// Force dynamic to ensure the server doesn't cache the API response
export const dynamic = 'force-dynamic';

const MIN_REVIEWS = 50;
const MAX_REVIEWS = 5000;
const TARGET_BATCH_SIZE = 5;
const FETCH_POOL_SIZE = 40;
const MAX_ATTEMPTS = 10;
const SEARCH_RADIUS = 2000.0;

// Shuffle Algorithm to randomize the order of batch
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Polar Coordinate Jitter Algorithm (0 to 20km radius)
// Refer to https://www.youtube.com/watch?v=O5wjXoFrau4 when debugging
function getJitteredCoordinates(lat, lng, maxRadiusKm = 20) {

  // Pick a random distance (0 to maxRadius)
  // sqrt(random()) for distributing evenly in the circle, otherwise points would clump in the center.
  const r = maxRadiusKm * Math.sqrt(Math.random());

  // Pick a random angle (0 to 2*PI radians)
  const theta = Math.random() * 2 * Math.PI;

  // Convert Polar (distance/angle) to Cartesian offsets (km)
  const dy = r * Math.cos(theta);
  const dx = r * Math.sin(theta);

  // Convert km offsets to degrees
  const newLat = lat + (dy / 111.32); // Latitude: 1 deg = ~111.32 km

  // convert lat to radians for the cosine function
  const newLng = lng + (dx / (111.32 * Math.cos(lat * (Math.PI / 180)))); // Longitude: 1 deg = ~111.32 km * cos(lat)

  console.log(`Jitter Jump: ${r.toFixed(2)}km away at angle ${(theta * 180 / Math.PI).toFixed(0)}°`);

  return { lat: newLat, lng: newLng, dist: r };
}

export async function POST(request) {
  console.log("----- API REQUEST STARTED: /api/game/batch -----");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let { lat: anchorLat, lng: anchorLng, category, seenIds = [] } = body;
  anchorLat = Number(anchorLat);
  anchorLng = Number(anchorLng);

  console.log("Input Coordinates:", { anchorLat, anchorLng });
  console.log("Seen IDs Count:", seenIds.length);

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

    // Track current search center
    let searchLat = anchorLat;
    let searchLng = anchorLng;
    let isNewLocation = true;

    // fetch until there is enough candidates to shuffle, or we run out of pages
    do {
      attempts++;

      //If new location is needed (Start or Dead End), Jitter from the Anchor
      if (isNewLocation) {
        const jitter = getJitteredCoordinates(anchorLat, anchorLng, 20);
        searchLat = jitter.lat;
        searchLng = jitter.lng;
        isNewLocation = false;
        console.log(`Jittering to new spot: ${jitter.dist.toFixed(2)}km away (Attempt ${attempts})`);
      }

      const requestBody = {
        locationRestriction: {
          circle: {
            center: { latitude: searchLat, longitude: searchLng },
            radius: SEARCH_RADIUS
          }
        },
        includedPrimaryTypes: [category],
        maxResultCount: 20,
        ...(nextPageToken && { pageToken: nextPageToken })
      };

      console.log(`Fetching Page ${attempts + 1}...`);

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
        console.error(`Google Error: ${response.status}`);
        isNewLocation = true;
        nextPageToken = null;
        continue;
      }

      const data = await response.json();
      const rawPlaces = data.places || [];
      console.log(`Google returned ${rawPlaces.length} raw results`);
      nextPageToken = data.nextPageToken;

      // Filter Logic
      const potentialPlaces = rawPlaces.filter(place => {
        const reviewCount = place.userRatingCount || 0;
        const hasPhotos = place.photos && place.photos.length > 0;

        const isDuplicate = candidates.some(p => p.placeId === place.id);

        const isSeen = seenIds.includes(place.id);

        // log why the place was filtered out
        if (!hasPhotos) console.log(`Dropped ${place.displayName?.text}: No Photos`);
        if (reviewCount < MIN_REVIEWS) console.log(`Dropped ${place.displayName?.text}: Low Reviews (${reviewCount})`);
        if (isSeen) console.log(`Dropped ${place.displayName?.text}: Already Seen`);

        return !isDuplicate && !isSeen && hasPhotos && reviewCount >= MIN_REVIEWS && reviewCount <= MAX_REVIEWS;
      });

      console.log(`Kept ${potentialPlaces.length} valid candidates from this page`);

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

      // CRITICAL: Decide next step
      if (data.nextPageToken) {
        // If this location has more pages, stay here!
        nextPageToken = data.nextPageToken;
        isNewLocation = false;
      } else {
        // If this location is dry, force a JUMP to a new spot next loop!
        console.log("🚫 Location exhausted. Preparing to jump...");
        nextPageToken = null;
        isNewLocation = true;
      }

      // Continue fetching until we have a enough in the pool (40 items) or hit max attempts
    } while (candidates.length < FETCH_POOL_SIZE && attempts < MAX_ATTEMPTS);

    console.log(`----- BATCH FETCH COMPLETE -----`);
    console.log(`API Calls Used: ${attempts}`);
    console.log(`Candidates Found: ${candidates.length}`);
    console.log(`Next Page Available: ${!!nextPageToken}`);

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