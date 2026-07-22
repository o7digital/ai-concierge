# Channel Manager persistence

`ai-concierge` mirrors chat traffic to the Olivia AI Channel Manager so the central backup in `suitesmine-bot` includes these conversations too.

Default endpoint:

```txt
https://olivia-ai.o7digital.com/api/widget/conversations
```

Optional env vars:

```bash
OLIVIA_CHANNEL_MANAGER_URL="https://olivia-ai.o7digital.com/api/widget/conversations"
OLIVIA_CHANNEL_MANAGER_DISABLED="false"
```

Payload fields accepted by `/chat` and forwarded when present:

- `clientCode` or `clientId`
- `visitorId`, `sessionId` or `conversationId`
- `visitorName` or `name`
- `email`
- `phone`
- `language`
- `source`
- `pageUrl`
- `pageTitle`
- `metadata`

If no visitor/session id is provided, the service creates a fallback id. For complete history threading, widgets should send a stable `visitorId`.
