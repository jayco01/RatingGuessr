import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const MIN_REVIEWS = 100;
const MAX_REVIEWS = 900;

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

    const requestBody = {
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000.0
        }
      },
      includedPrimaryTypes: [category],
      maxResultCount: 20
    };

    const url = 'https://places.googleapis.com/v1/places:searchNearby';


    const response = await fetch(url, {
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
      console.error("Google API Error:", errorText);
      throw new Error(`Google API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawPlaces = data.places || [];


    const potentialPlaces = rawPlaces.filter(place => {
      const reviewCount = place.userRatingCount || 0;
      return reviewCount >= MIN_REVIEWS && reviewCount <= MAX_REVIEWS;
    });

    const validBatch = [];

    for (const place of potentialPlaces) {
      const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${place.location.latitude},${place.location.longitude}&source=outdoor&radius=50&key=${apiKey}`;

      const metaRes = await fetch(metaUrl);
      const meta = await metaRes.json();

      if (meta.status === 'OK') {
        validBatch.push({
          placeId: place.id,
          name: place.displayName.text,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          location: place.location
        });
      }

      if (validBatch.length >= 10) break;
    }

    return NextResponse.json(validBatch);

  } catch (error) {
    console.error("Places API Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}