export type ActivityMode = 'walk' | 'bike'

export type BottomTab = 'overview' | 'places' | 'elevation'

export type PlaceCategory = 'nature' | 'culture' | 'point_of_interest';

export type PlaceCategoryMeta = {
  category: PlaceCategory;
  color: string;
  label: string;
};

export type Place = {
  id: string
  name: string
  category: string
  description: string
  distance: string
  color: 'blue' | 'green' | 'orange'
}

export type InterestingPlace = {
  id: string
  name: string
  lat: number
  lng: number
  primaryType?: string
  rating?: number
  userRatingCount?: number
  distanceToRouteM?: number
  score?: number
  photos?: Array<{
    name: string
  }>
}

export type LatLng = {
  lat: number;
  lng: number;
};

export type PlaceCandidate = {
  id: string;
  name: string;
  position: LatLng;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
  }>;
  distanceToRouteM: number;
  score: number;
};

export type RoutePoint =
  | string
  | google.maps.LatLng
  | google.maps.LatLngLiteral
  | google.maps.routes.Waypoint

export type RouteActivityMode = 'walk' | 'bike'

export type BuiltRouteResult = {
  route: google.maps.routes.Route
  distanceMeters: number | null
  durationMillis: number | null
  path: google.maps.LatLngAltitude[] | null
  encodedPolyline: string | null
  warnings: string[]
}

export type BuildRouteParameters = {
  map: google.maps.Map
  origin: RoutePoint
  destination: RoutePoint
  activityMode?: RouteActivityMode
  fitBounds?: boolean
  intermediates?: google.maps.LatLngLiteral[]
}

export type RoutePathPoint =
  | google.maps.LatLng
  | google.maps.LatLngLiteral
  | google.maps.LatLngAltitude

export type ElevationProfilePoint = {
  distanceKm: number
  elevationM: number
  lat: number
  lng: number
  resolutionM?: number
}

export type ElevationStats = {
  totalDistanceKm: number
  totalAscentM: number
  totalDescentM: number
  minElevationM: number
  maxElevationM: number
  startElevationM: number
  finishElevationM: number
  difficulty: 'Easy' | 'Moderate' | 'Challenging'
  profile: ElevationProfilePoint[]
}
