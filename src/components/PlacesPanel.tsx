import type { InterestingPlace } from '../utils/types';
import { PlaceCard, type PlacePhotoState } from './PlaceCard';
import { RouteSummaryPlaceholder } from './RouteSummaryPlaceholder';

type PlacesPanelProps = {
  places: InterestingPlace[];
  selectedPlace: string | null;
  photoCache: Record<string, PlacePhotoState>;
  showPlaceholder: boolean;
  placeholderMessage: string;
  placeholderText: string;
  onSelectPlace: (placeId: string) => void;
  onAddToRoute: (placeId: string) => void;
  onOpenInGoogleMaps: (placeId: string) => void;
};

export function PlacesPanel({
  places,
  selectedPlace,
  photoCache,
  showPlaceholder,
  placeholderMessage,
  placeholderText,
  onSelectPlace,
  onAddToRoute,
  onOpenInGoogleMaps
}: Readonly<PlacesPanelProps>) {
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
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={selectedPlace === place.id}
            photoState={photoCache[place.id]}
            onSelect={onSelectPlace}
            onAddToRoute={onAddToRoute}
            onOpenInGoogleMaps={onOpenInGoogleMaps}
          />
        ))}
      </div>
    </>
  );
}
