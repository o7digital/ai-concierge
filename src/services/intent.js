import { createJsonCompletion } from "./openai.js";

const ALLOWED_INTENTS = new Set([
  "availability",
  "pricing",
  "rooms_info",
  "faq",
  "handoff",
]);

export async function detectIntent(message) {
  const trimmed = typeof message === "string" ? message.trim() : "";

  const response = await createJsonCompletion({
    messages: [
      {
        role: "system",
        content:
          "You are an intent classifier for a hotel concierge. " +
          "Return only a strict JSON object with a single key: intent. " +
          "Allowed intents: availability, pricing, rooms_info, faq, handoff. " +
          "Always choose the closest intent. No extra keys.",
      },
      { role: "user", content: trimmed || "(empty)" },
    ],
    temperature: 0,
  });

  const content = response?.choices?.[0]?.message?.content?.trim() || "{}";
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return { intent: "handoff" };
  }

  const intent =
    typeof parsed.intent === "string" ? parsed.intent.trim().toLowerCase() : null;

  if (!ALLOWED_INTENTS.has(intent)) {
    return { intent: "handoff" };
  }

  return { intent };
}
