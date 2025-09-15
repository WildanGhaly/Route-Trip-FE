# Frontend — React + Vite (TypeScript)

Simple UI for the HOS Planner API: enter locations + current cycle hours, submit, then view a summary, a map with colored markers, and ELD-style canvases per day.

## Requirements

- Node 18+ (20+ recommended)
- npm

## Structure
```
frontend/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .env.example
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ api.ts
   ├─ types.ts
   ├─ styles.css
   └─ components/
      ├─ TripForm.tsx
      ├─ MapView.tsx
      └─ LogCanvas.tsx
```

## Environment

Copy and edit:

```bash
cp .env.example .env.local
```

**.env.local:**

```
VITE_API_BASE=http://127.0.0.1:8000
```

For production on the same domain as backend (via Nginx), set VITE_API_BASE= (empty) and rebuild so the app calls /api/... relative to the site origin.

For split domains, set it to your backend origin.

## Run (dev)
```bash
npm install
npm run dev
```

Open the shown URL (usually http://localhost:5173
).

## Build
```bash
npm run build
npm run preview
```

## What it does

- **Form:** Current Location, Pickup, Dropoff, Current Cycle Used Hours.
- **Map:**
  - Geocodes strings via public Nominatim and shows markers:
  - Current (blue), Pickup (green), Destination (red).
  - Draws either an encoded route polyline (if backend returns one) or a straight line as a placeholder.
- **ELD logs:** Per-day canvas charts; grid and line colors adapt to light/dark. Logs render inline (no modal).

## Common tweaks

- **Marker colors/icons:** see MapView.tsx for the three Leaflet icon instances.
- **Styling/theme:** edit CSS variables in styles.css (:root and [data-theme="dark"]).
- If you see CORS errors, ensure backend allows your FE origin or deploy behind a single Nginx server and proxy /api/.

## Troubleshooting

- **404 on refresh with static hosting:** configure your host to fallback to index.html (SPA).
- **CORS:** add your FE origin to backend CORS_ALLOW_ORIGINS if using split origins.
- **Rate limits:** Nominatim is public and throttled; heavy testing may require a different geocoder or backend caching.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.