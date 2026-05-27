export type RawPlace = {
  id: string;
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
  }>;
};

export async function searchPlacesAlongRoute({
  encodedPolyline,
  apiKey,
  languageCode = 'ru'
}: {
  encodedPolyline: string;
  apiKey: string;
  languageCode?: string;
}): Promise<RawPlace[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.location',
        'places.primaryType',
        'places.rating',
        'places.userRatingCount',
        'places.photos.name'
      ].join(',')
    },
    body: JSON.stringify({
      textQuery: [
        'tourist attractions',
        'museums',
        'parks',
        'gardens',
        'landmarks',
        'viewpoints',
        'monuments',
        'historic places',
        'churches'
      ].join(' OR '),
      searchAlongRouteParameters: {
        polyline: {
          encodedPolyline
        }
      },
      maxResultCount: 20,
      languageCode
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Places search failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { places?: RawPlace[] };
  return data.places ?? [];
}