const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// 630 E University Dr, Granger, IN
const LOCATION_BIAS = {
  circle: {
    center: { latitude: 41.7318, longitude: -86.1145 },
    radius: 20000, // 20km
  },
};

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export async function autocompletePlaces(
  input: string
): Promise<PlaceSuggestion[]> {
  if (!API_KEY || input.length < 2) return [];

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
        body: JSON.stringify({
          input,
          locationBias: LOCATION_BIAS,
          includedPrimaryTypes: [
            "restaurant",
            "cafe",
            "meal_takeaway",
            "bar",
            "food",
          ],
        }),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const suggestions = data.suggestions ?? [];

    return suggestions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((s: any) => s.placePrediction)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => ({
        placeId: String(s.placePrediction.placeId ?? ""),
        mainText: String(s.placePrediction.structuredFormat?.mainText?.text ?? ""),
        secondaryText: String(s.placePrediction.structuredFormat?.secondaryText?.text ?? ""),
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function getPlaceDetails(
  placeId: string
): Promise<{ address: string; mapsUrl: string; websiteUrl: string | null } | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "formattedAddress,websiteUri",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return {
      address: data.formattedAddress ?? "",
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.formattedAddress ?? "")}&query_place_id=${placeId}`,
      websiteUrl: data.websiteUri ?? null,
    };
  } catch {
    return null;
  }
}

export interface NearbyRestaurant {
  id: string;
  name: string;
  address: string;
  mapsUri: string;
  websiteUri: string | null;
  priceLevel: string | null;
  typeName: string | null;
}

export async function searchNearbyRestaurants(): Promise<NearbyRestaurant[]> {
  if (!API_KEY) return [];

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.priceLevel,places.googleMapsUri,places.websiteUri,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          includedTypes: ["restaurant", "cafe", "meal_takeaway", "fast_food_restaurant"],
          locationRestriction: {
            circle: {
              center: { latitude: 41.7318, longitude: -86.1145 },
              radius: 4000,
            },
          },
          maxResultCount: 20,
        }),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const places = data.places ?? [];

    return places
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => {
        const level = p.priceLevel;
        return level !== "PRICE_LEVEL_EXPENSIVE" && level !== "PRICE_LEVEL_VERY_EXPENSIVE";
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: p.id ?? "",
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        mapsUri: p.googleMapsUri ?? "",
        websiteUri: p.websiteUri ?? null,
        priceLevel: p.priceLevel ?? null,
        typeName: p.primaryTypeDisplayName?.text ?? null,
      }));
  } catch {
    return [];
  }
}

export async function lookupPlace(
  query: string
): Promise<{ address: string; mapsUrl: string } | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "places.formattedAddress,places.id",
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: LOCATION_BIAS,
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const place = data.places?.[0];
    if (!place?.id) return null;

    return {
      address: place.formattedAddress ?? "",
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.formattedAddress ?? "")}&query_place_id=${place.id}`,
    };
  } catch {
    return null;
  }
}
