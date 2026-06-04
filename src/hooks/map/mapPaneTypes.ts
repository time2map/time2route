import type { MapPickPoint } from '../../api/placeAutocomplete';

export type RouteEndpointPoint = {
  lat: number;
  lng: number;
  address: string;
};

export type MapPickState = MapPickPoint;
