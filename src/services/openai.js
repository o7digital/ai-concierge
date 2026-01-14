import OpenAI from "openai";

export const OPENAI_MODEL = "gpt-4o-mini";

let cachedClient = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "OPENAI_API_KEY is missing. Set it in your environment or .env file.",
    );
    error.code = "OPENAI_API_KEY_MISSING";
    throw error;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }

  return cachedClient;
}

export async function createChatCompletion({
  messages,
  temperature = 0.4,
  maxOutputTokens,
} = {}) {
  const openai = getOpenAIClient();

  return openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  });
}

export async function createJsonCompletion({
  messages,
  temperature = 0,
  maxOutputTokens,
} = {}) {
  const openai = getOpenAIClient();

  return openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
    response_format: { type: "json_object" },
  });
}
