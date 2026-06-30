# Time2Route

A web app for planning walking and cycling routes. It builds a path between two points on the map and shows distance, travel time, an elevation profile, and interesting places along the way.

## Features

- **Routing** — walking or cycling (Google Routes API)
- **Start & end** — address input, Places Autocomplete, or pick a point on the map
- **Waypoints** — add POIs from the “places along route” list into the route
- **Route overview** — distance, duration, ascent/descent, elevation chart (Chart.js)
- **Places along the route** — search via Places API (New), filter by distance to the route line, cards with photos and ratings
- **Map** — route polyline, place markers, highlight for the selected place

## Stack

- React 19 + TypeScript
- Vite 8
- Google Maps JavaScript API (Maps, Routes, Geocoding, Elevation, Advanced Markers)
- Google Places API (New) — place search and photos
- Chart.js / react-chartjs-2 — elevation profile

## Quick start

```bash
npm install
```

Create a `.env` file in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_key
VITE_GEOAPIFY_API_KEY=your_geoapify_key
# Optional: disable Geoapify IP fallback during local development
# VITE_GEOAPIFY_IP_ENABLED=false
```

`VITE_GEOAPIFY_API_KEY` is used as a fallback when browser geolocation is unavailable (see [Geoapify IP Geolocation](https://www.geoapify.com/ip-geolocation-api)). Set `VITE_GEOAPIFY_IP_ENABLED=false` to skip Geoapify API calls while developing.

Development server:

```bash
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Google Cloud

For a single API key, enable and restrict these services:

| Service | Purpose |
|---------|---------|
| Maps JavaScript API | map, markers, geocoding |
| Routes API | route computation |
| Elevation API | elevation profile |
| Places API (New) | places along route, autocomplete, photos |

For **Advanced Markers**, create a [Map ID](https://developers.google.com/maps/documentation/javascript/advanced-markers/start) in Google Cloud Console and set `VITE_GOOGLE_MAPS_MAP_ID`.

## Project structure

```
src/
├── App.tsx                 # app state, sidebar + map wiring
├── components/
│   ├── Sidebar.tsx         # route form, tabs, place cards
│   ├── MapPane.tsx         # map, route build, markers
│   ├── googleRouteLayer.ts # Routes API, polyline
│   ├── placesAlongRoute.ts # POI search along encoded polyline
│   └── ElevationProfileChart.tsx
├── api/googlePlacePhotos.ts
└── utils/                  # types, elevation, POI categories
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | serve `dist/` locally |
| `npm run lint` | ESLint |

