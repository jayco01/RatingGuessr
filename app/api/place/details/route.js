import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!placeId) return NextResponse.json({ error: "Missing Place ID" }, { status: 400 });

  try {
    const fieldMask = [
      "id",
      "displayName",
      "formattedAddress",
      "googleMapsUri",
      "websiteUri"
    ].join(",");

    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      }
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}