import type { InterestingPlace } from '../utils/types';
import { PlaceCard, type PlacePhotoState } from './PlaceCard';
import { RouteSummaryPlaceholder } from './RouteSummaryPlaceholder';

type PlacesPanelProps = {
  places: InterestingPlace[];
  selectedPlace: string | null;
  routeIntermediates: Array<{ id: string; lat: number; lng: number }>;
  photoCache: Record<string, PlacePhotoState>;
  showPlaceholder: boolean;
  placeholderMessage: string;
  placeholderText: string;
  onSelectPlace: (placeId: string) => void;
  onAddToRoute: (placeId: string) => void;
  onRemoveFromRoute: (placeId: string) => void;
  onOpenInGoogleMaps: (placeId: string) => void;
};

export function PlacesPanel({
  places,
  selectedPlace,
  routeIntermediates,
  photoCache,
  showPlaceholder,
  placeholderMessage,
  placeholderText,
  onSelectPlace,
  onAddToRoute,
  onRemoveFromRoute,
  onOpenInGoogleMaps
}: Readonly<PlacesPanelProps>) {
  const stopIndexById = new Map<string, number>();
  routeIntermediates.forEach((stop, index) => {
    stopIndexById.set(stop.id, index);
  });

  const sortedPlaces = [...places].sort((a, b) => {
    const aIndex = stopIndexById.get(a.id);
    const bIndex = stopIndexById.get(b.id);

    if (typeof aIndex === 'number' && typeof bIndex === 'number') {
      return aIndex - bIndex;
    }

    if (typeof aIndex === 'number') return -1;
    if (typeof bIndex === 'number') return 1;
    return 0;
  });

  if (showPlaceholder) {
    return (
      <RouteSummaryPlaceholder
        message="Interesting places along the route"
        text={`${placeholderMessage}. ${placeholderText}`}
      />
    );
  }

  return (
    <>
      <h3 className="places-title">Interesting places along the route</h3>

      <div className="place-list place-list-single">
        {sortedPlaces.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={selectedPlace === place.id}
            isAddedToRoute={stopIndexById.has(place.id)}
            routeStopIndex={(stopIndexById.get(place.id) ?? -1) + 1}
            photoState={photoCache[place.id]}
            onSelect={onSelectPlace}
            onAddToRoute={onAddToRoute}
            onRemoveFromRoute={onRemoveFromRoute}
            onOpenInGoogleMaps={onOpenInGoogleMaps}
          />
        ))}
      </div>
    </>
  );
}
