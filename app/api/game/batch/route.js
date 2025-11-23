import client from "@/app/lib/googleMapsClient";
import {NextResponse} from "next/server";

// forces dynamic (no caching) because random results from google api is needed.
// in other words, I don't want multiple users to get the same locations if they play at the same time.
export const dynamic = 'force-dynamic';

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
      maxResultCount: 20 //fetching more than what is needed because some will get filtered out
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
  }
}
