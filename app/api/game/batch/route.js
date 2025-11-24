import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const MIN_REVIEWS = 50;
const MAX_REVIEWS = 5000;
const TARGET_BATCH_SIZE = 10;

export async function POST(request) {
  console.log("----- API REQUEST STARTED: /api/game/batch -----");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { lat, lng, category } = body;
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
      "places.primaryType"
    ].join(",");

    let validBatch = [];
    let nextPageToken = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 10; //prevent infinite loops


    do {
      attempts++;
      console.log(`--- Fetch Attempt #${attempts} (Current Batch: ${validBatch.length}) ---`);

      const requestBody = {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 15000.0
          }
        },
        includedPrimaryTypes: [category],
        maxResultCount: 20,
        ...(nextPageToken && { pageToken: nextPageToken })// add token if it exists
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

      const data = await response.json();
      const rawPlaces = data.places || [];

      // update token for next loop
      nextPageToken = data.nextPageToken;


      const potentialPlaces = rawPlaces.filter(place => {
        const reviewCount = place.userRatingCount || 0;
        // basic duplication check to ensure locations are not added multiple times
        const isDuplicate = validBatch.some(p => p.placeId === place.id);
        return !isDuplicate && reviewCount >= MIN_REVIEWS && reviewCount <= MAX_REVIEWS;
      });

      console.log(`Candidates after filter: ${potentialPlaces.length}`);

      // Verify that locations have Street View
      for (const place of potentialPlaces) {
        if (validBatch.length >= TARGET_BATCH_SIZE) break;

        const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${place.location.latitude},${place.location.longitude}&source=outdoor&radius=50&key=${apiKey}`;
        const metaRes = await fetch(metaUrl);
        const meta = await metaRes.json();

        // store location details and street view details in one object
        if (meta.status === 'OK') {
          validBatch.push({
            placeId: place.id,
            name: place.displayName.text,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            location: place.location
          });
        }
      }

      if (!nextPageToken) break;

    } while (validBatch.length < TARGET_BATCH_SIZE && attempts < MAX_ATTEMPTS);

    return NextResponse.json(validBatch);

  } catch (error) {
    console.error("Places API Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}