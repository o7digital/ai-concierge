# Project Notes - AI Concierge (Suites Mine)

## Status
- Node/Express ESM app is running with `/chat` endpoint (GET + POST).
- Cloudbeds API scaffold is implemented and controlled by `DEMO_MODE` in `src/config/settings.js`.
- OpenAI client is centralized and uses `OPENAI_API_KEY` from `.env`.
- Basic browser test page is served at `/chat` (and also at `/`).

## Local Run
1. Create `.env` from `.env.example`.
2. Set `OPENAI_API_KEY` and Cloudbeds credentials in `.env`.
3. Start: `npm run dev` (or `npm start`).
4. Test in browser: `http://localhost:3000/chat`.

## Required Environment Variables (names only)
- OPENAI_API_KEY
- CLOUDBEDS_BASE_URL
- CLOUDBEDS_PROPERTY_ID
- CLOUDBEDS_CLIENT_ID
- CLOUDBEDS_CLIENT_SECRET
- CLOUDBEDS_ACCESS_TOKEN (optional)
- CLOUDBEDS_API_KEY (optional)
- CLOUDBEDS_TOKEN_URL (optional)
- CLOUDBEDS_ENDPOINT_AVAILABILITY
- CLOUDBEDS_ENDPOINT_ROOMS
- CLOUDBEDS_ENDPOINT_POLICIES
- CLOUDBEDS_ENDPOINT_PRICING

## Railway
- Deploy from GitHub repo.
- Add the same env vars (values only in Railway settings).
- Redeploy after any variable change.
- Test URL: `https://<railway-app>.up.railway.app/chat` (GET test page).

## Cloudbeds Staging Checklist
Cloudbeds API returns data only if the property has inventory set.
Minimum setup:
1) Create Room Type (Accommodation Type).
2) Add at least 1 unit (room) for the type.
3) Create a Rate Plan and assign price.
4) Open inventory on the calendar for test dates.
5) Verify New Reservation shows availability.

## Common Errors
- `openai_api_key_missing`: `OPENAI_API_KEY` not loaded (restart server).
- `openai_error` with 401: invalid or revoked key.
- `openai_error` with 429: insufficient quota; add billing/credit on OpenAI platform.
- No availability in reply: Cloudbeds room types/rates/inventory missing.

## Security
- `.env` is ignored by git. Do not commit secrets.

## Latest Changes (pushed)
- Added root route `/` mapped to chat test page.
- Improved error handling for OpenAI and Cloudbeds.
- Added Cloudbeds API scaffold with OAuth token flow.

