import client from "@/app/lib/googleMapsClient";
import {NextResponse} from "next/server";

// forces dynamic (no caching) because random results from google api is needed.
// in other words, I don't want multiple users to get the same locations if they play at the same time.
export const dynamic = 'force-dynamic';
const reviewCountLowerEnd = 100;
const reviewCountHigherEnd = 900;

export async function POST(request) {
  const {lat, lng, category} = await request.json;

  try {
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.location",
      "places.rating",
      "places.userRatingCount",
      "places.primaryType"
    ].join(",");

    const requestObj = {
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000.0 // 5k radius
        }
      },
      includedPrimaryTypes: [category],
      maxResultCount: 40 //fetching more than what is needed because most will get filtered out
    };

    // fetch nearby places that meets the criteria stated in the "fieldMask"
    const [response] = await client.searchNearby(requestObj, {
      otherArgs: {
        headers: {
          "X-Goog-FieldMask": fieldMask,
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_SERVER_KEY
        }
      }
    });

    // filter result
    // only places with over 100 and less than 900 reviews
    // not to unknown && not too main stream
    const potentialPlaces = response.places.filter(place => {
      const reviewCount = place.userRatingCount || 0;
      return reviewCount >= reviewCountLowerEnd && reviewCount <= reviewCountHigherEnd;
    });

    const validBatch = [];

    for (const place of potentialPlaces) {
      const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${place.location.latitude},${place.location.longitude}&source=outdoor&radius=50&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`

      const metaRes = await fetch(metaUrl);
      const meta = await meta.json();

      if (meta.status !== 200) {
        validBatch.push({
          placeId: place.id,
          name: place.displayName.text,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          location: place.location
        });
      }
      // stop once there is at least 10 places
      if (validBatch.length >= 10) {
        break;
      }
    }

    return NextResponse.json(validBatch);

  } catch (error) {
    console.log("Places API Fetch Batch Error",error);
    return NextResponse.json({ error: error.message }, {status: 500});
  }
}
