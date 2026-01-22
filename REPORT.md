# Cloudbeds Availability Issue - Jan 22, 2026

## What we tried
- Switched Cloudbeds auth to API key (`Authorization: Bearer cbat_...`) instead of query param; `getRooms` works (200).
- Removed `roomTypeID` param when using API key to avoid 404; still no availability.
- Tested endpoints with API key:
  - `getRooms`: 200 OK.
  - `getAvailability`, `getRates`, `getAvailabilityAndRates`: always 404 HTML.

## Findings
- Logs show `authMode: api_key` and URL `.../getAvailability?propertyID=319424&start_date=...&adults=...` returning `status: 404`.
- Cloudbeds sandbox refuses the client_credentials flow (“Invalid Client type (property)…”).
- No “Active Property API Session” in Cloudbeds → no OAuth access token.
- API key alone in this environment does not expose availability/pricing endpoints; only rooms is accessible.

## Next steps
- Obtain a Cloudbeds access token (Property API Session) from Cloudbeds support or a published sandbox app, then set `CLOUDBEDS_ACCESS_TOKEN` in Railway and redeploy (remove/ignore `CLOUDBEDS_API_KEY`). Logs should then show `authMode: access_token`.
- If Cloudbeds has a different URL/endpoint for availability with API key, share it so we can update `ENDPOINT_AVAILABILITY/PRICING`.
- Temporary fallback to test UX: set `DEMO_MODE=true` on Railway to use the mock until a valid token is available.
