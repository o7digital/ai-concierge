# AI Concierge - Suites Mine

Production-ready baseline for a hotel AI concierge, built for Suites Mine and ready for Cloudbeds integration.

## Local run

1. Install dependencies
   - `npm install`
2. Create env file
   - `cp .env.example .env`
   - Set `OPENAI_API_KEY`
3. Start server
   - `npm start`

## DEMO vs PROD

- DEMO mode is controlled by `DEMO_MODE` in `src/config/settings.js`.
- `true` uses the local Cloudbeds mock implementation.
- `false` switches to the Cloudbeds API scaffold in `src/services/pms/cloudbeds.api.js`.

## Cloudbeds staging

1. Log in to the Cloudbeds connect dashboard and create a Client ID and Client Secret.
2. Update `.env` with:
   - `CLOUDBEDS_PROPERTY_ID`
   - `CLOUDBEDS_CLIENT_ID`
   - `CLOUDBEDS_CLIENT_SECRET`
3. Set `DEMO_MODE=false` in `src/config/settings.js`.
4. Start the server and test `/chat` again.

If your Cloudbeds account uses API keys or custom endpoints, adjust the optional overrides in `.env`.

## Endpoint

`POST /chat`

Body (JSON):
```
{
  "message": "I want a suite for two nights",
  "checkIn": "2025-02-10",
  "checkOut": "2025-02-12",
  "guests": 2,
  "roomType": "Junior Suite"
}
```

Response (JSON):
```
{
  "reply": "...",
  "intent": "availability",
  "language": "en"
}
```
