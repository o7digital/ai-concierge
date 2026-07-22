const DEFAULT_CHANNEL_MANAGER_URL =
  "https://olivia-ai.o7digital.com/api/widget/conversations";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildVisitorId(payload, clientCode) {
  return (
    clean(payload.visitorId) ||
    clean(payload.sessionId) ||
    clean(payload.conversationId) ||
    `ai-concierge-${clientCode}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function getChannelContext(payload = {}) {
  const clientCode = clean(payload.clientCode || payload.clientId) || "suitesmine";
  return {
    clientCode,
    visitorId: buildVisitorId(payload, clientCode),
    visitorName: clean(payload.visitorName || payload.name),
    email: clean(payload.email),
    phone: clean(payload.phone),
    language: clean(payload.language),
    source: clean(payload.source) || "ai-concierge",
    metadata: {
      ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
      pageUrl: clean(payload.pageUrl),
      pageTitle: clean(payload.pageTitle),
      aiConcierge: true,
    },
  };
}

export async function persistVisitorMessage(payload, content, extraMetadata = {}) {
  const endpoint = process.env.OLIVIA_CHANNEL_MANAGER_URL || DEFAULT_CHANNEL_MANAGER_URL;
  if (process.env.OLIVIA_CHANNEL_MANAGER_DISABLED === "true") return null;

  const context = getChannelContext(payload);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientCode: context.clientCode,
      visitorId: context.visitorId,
      visitorName: context.visitorName,
      email: context.email,
      phone: context.phone,
      source: context.source,
      language: context.language,
      content,
      metadata: {
        ...context.metadata,
        ...extraMetadata,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Channel Manager write failed: ${response.status}`);
  }

  return response.json();
}

export async function persistAssistantMessage(payload, content, model, extraMetadata = {}) {
  const endpoint = process.env.OLIVIA_CHANNEL_MANAGER_URL || DEFAULT_CHANNEL_MANAGER_URL;
  if (process.env.OLIVIA_CHANNEL_MANAGER_DISABLED === "true") return null;

  const context = getChannelContext(payload);
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientCode: context.clientCode,
      visitorId: context.visitorId,
      content,
      model,
      metadata: extraMetadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Channel Manager assistant write failed: ${response.status}`);
  }

  return response.json();
}

export async function safePersistVisitorMessage(...args) {
  try {
    return await persistVisitorMessage(...args);
  } catch (error) {
    console.warn("[channel-manager] visitor persistence skipped", error.message);
    return null;
  }
}

export async function safePersistAssistantMessage(...args) {
  try {
    return await persistAssistantMessage(...args);
  } catch (error) {
    console.warn("[channel-manager] assistant persistence skipped", error.message);
    return null;
  }
}
