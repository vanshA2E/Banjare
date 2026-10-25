# Banjare

Banjare is a Rajasthan-focused tourist safety demo with a mobile tourist companion and a desktop authority console.

## Current apps

- `banjare-trip-guardian-ui-main`: mobile-width tourist flow with mock OTP, fallback/live browser location, zone awareness, restricted-zone notification, cancelable SOS, issue reporting, alerts, and editable profile.
- `banjare-nexus-control-main`: authority console with demo login, five-second live polling, a real OpenStreetMap incident view, incident filtering/search, persistent assign and resolve actions, a searchable Digital ID registry, editable authority profile, teams, and analytics views.
- `schema.sql`: MySQL 8 tables, indexes, foreign keys, and starter safety zones/teams.

## Run locally

```bash
cd banjare-trip-guardian-ui-main && npm install
npm run api
```

In two other terminals:

```bash
cd banjare-trip-guardian-ui-main && npm run dev -- --host 0.0.0.0 --port 5173
cd banjare-nexus-control-main && npm install && npm run dev -- --host 0.0.0.0 --port 5174
```

The local API stores demo data in `banjare-trip-guardian-ui-main/.data/` so both websites share the same records. The apps use browser geolocation and an OpenStreetMap live embed; the tourist app falls back to Jaipur when permission is denied. For deployed mode, deploy the tourist app's `api/` functions with Vercel, set `DATABASE_URL` to the same MySQL 8 connection string used by the schema, and set `VITE_API_BASE_URL` in **both** apps to that deployed API URL (for example, `https://tourist-api.example.com`). The tourist app then upserts each signed-in phone number into `tourists` and sends reports/SOS incidents to MySQL; the authority console polls `/api/tourists` and `/api/incidents`, so new travellers and incidents appear there across separate domains.

## Three-minute demo

1. Open the tourist app, enter any 10+ digit phone number, then any six-digit OTP. The OTP is a **DEMO** shortcut.
2. On Home, inspect the zone-aware map surface and live/fallback coordinates. Submit a hazard report.
3. Press SOS and wait through the cancelable countdown. The incident is written to localStorage for this demo session.
4. Open the authority console, enter any credentials, and see the synced tourist count and SOS appear in the incident queue. Open Live map to see the latest GPS incident on OpenStreetMap, assign `Team Suraksha`, then resolve it.
5. Open Digital IDs to search the traveller registry, or My profile to update the operator profile.
5. Visit Zones, Response teams, and Analytics to show the operator views.

## MySQL and production setup

Run `mysql -u <user> -p <database> < schema.sql`, then configure `DATABASE_URL` on the tourist deployment. `GROQ_API_KEY` is server-only and powers `api/assistant.ts`; never put it in a `VITE_*` variable. Authority authentication is still a demo gate and should be replaced with a server session/JWT and the seeded `authority_users` table before production. Media should use private object storage with signed URLs.

## Blockchain records

`blockchain/BanjareRecords.sol` anchors SHA-256 record hashes while keeping personal data off-chain. The tourist app creates a verifiable hash for SOS and issue reports. Deploy the contract to Polygon Amoy (or another EVM testnet), then add the RPC, contract address, and server-side private key to the deployment environment before adding a relayer to call `anchor(bytes32)`. Do not store private keys in the browser or commit them.

## Explicit demo shortcuts and production work

- **DEMO:** mock OTP accepts any code; production needs a real SMS provider and rate limits.
- **DEMO:** console login accepts any credentials; production needs Supabase Auth, role claims, MFA, and an auth guard.
- **DEMO:** localStorage is the offline fallback. Connected mode uses the MySQL-backed `/api/tourists` and `/api/incidents` bridge; production should add authenticated authority sessions, realtime subscriptions, offline retry queues, and conflict handling.
- **DEMO:** RLS policies in `schema.sql` allow all rows; production needs tourist/authority scoped policies and audit logs.
- **DEMO:** the map uses an OpenStreetMap export embed; production can replace it with Leaflet marker layers and server-fetched zones.
- **DEMO:** SOS/report media and notifications are local; production needs Storage, signed URLs, server-side validation, and push notification delivery.
- **DEMO:** browser fallback and localStorage remain available when the API is not configured; deployed mode uses MySQL-backed incident APIs.

## Verification

Both projects currently pass `npm run build` with Vite 8.3.5. Browser GPS permission, Supabase realtime, SMS delivery, emergency dispatch, and Groq calls require external services and have not been claimed as verified here.
