import { NextResponse } from "next/server";

// get random/fresh results every time
export const dynamic = 'force-dynamic';

const MIN_REVIEWS = 50;
const MAX_REVIEWS = 5000;
const TARGET_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 10; // limit to prevent infinite loop

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
      "places.primaryType",
      "places.photos"
    ].join(",");

    let validBatch = [];
    let nextPageToken = null;
    let attempts = 0;

    do {
      attempts++;

      const requestBody = {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 15000.0 // 15km radius
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

      // pagination
      // if nextPageToken exist, then there is another "page" of locations exist (i.e. a page 2)
      nextPageToken = data.nextPageToken;

      const potentialPlaces = rawPlaces.filter(place => {
        const reviewCount = place.userRatingCount || 0;

        const isGoodReviewCount = (reviewCount >= MIN_REVIEWS) && (reviewCount <= MAX_REVIEWS);
        const hasPhotos = place.photos && place.photos.length > 10; // only get restaurants that has at least 10 photos in google maps
        const isDuplicate = validBatch.some(p => p.placeId === place.id);

        return !isDuplicate && hasPhotos && isGoodReviewCount;
      });


      for (const place of potentialPlaces) {
        if (validBatch.length >= TARGET_BATCH_SIZE) break;

        const photoRef = place.photos[0].name;
        const attributions = place.photos[0].authorAttributions;

        validBatch.push({
          placeId: place.id,
          name: place.displayName.text,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          location: place.location,
          photoName: photoRef,
          attributions: attributions
        });
      }

      if (!nextPageToken) break;

    } while ( (validBatch.length < TARGET_BATCH_SIZE) && (attempts < MAX_ATTEMPTS));

    return NextResponse.json(validBatch);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}