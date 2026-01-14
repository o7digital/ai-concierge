import express from "express";

import { SYSTEM_PROMPT } from "../config/prompt.js";
import { DEMO_MODE, HOTEL_NAME } from "../config/settings.js";
import { detectIntent } from "../services/intent.js";
import { createChatCompletion } from "../services/openai.js";
import * as cloudbedsMock from "../services/pms/cloudbeds.mock.js";
import * as cloudbedsApi from "../services/pms/cloudbeds.api.js";
import { detectLanguage } from "../utils/language.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Concierge Test</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Georgia", "Times New Roman", serif;
      }
      body {
        margin: 0;
        padding: 32px;
        background: #f4f1ea;
        color: #2b2b2b;
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        padding: 28px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p {
        margin: 0 0 20px;
        color: #5a5a5a;
      }
      form {
        display: grid;
        gap: 14px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 14px;
      }
      input,
      textarea,
      button,
      select {
        font: inherit;
        padding: 10px 12px;
        border: 1px solid #d7d3c7;
        border-radius: 8px;
      }
      textarea {
        min-height: 110px;
        resize: vertical;
      }
      .row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      button {
        background: #2b2b2b;
        color: #ffffff;
        border: none;
        cursor: pointer;
        font-weight: 600;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      pre {
        background: #f9f6f0;
        border: 1px solid #efe9dc;
        padding: 16px;
        border-radius: 10px;
        overflow-x: auto;
      }
      .status {
        font-size: 13px;
        color: #7a6b4f;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Suites Mine AI Concierge</h1>
      <p>Quick browser test for the /chat endpoint.</p>
      <form id="chat-form">
        <label>
          Message
          <textarea name="message" required>Bonjour, avez-vous une suite du 10 au 12 fevrier ?</textarea>
        </label>
        <div class="row">
          <label>
            Check-in
            <input name="checkIn" placeholder="2025-02-10" />
          </label>
          <label>
            Check-out
            <input name="checkOut" placeholder="2025-02-12" />
          </label>
          <label>
            Guests
            <input name="guests" type="number" min="1" placeholder="2" />
          </label>
          <label>
            Room type
            <input name="roomType" placeholder="Junior Suite" />
          </label>
        </div>
        <button type="submit">Send to concierge</button>
        <div class="status" id="status"></div>
      </form>
      <h2>Response</h2>
      <pre id="response">Waiting for response...</pre>
    </main>
    <script>
      const form = document.getElementById("chat-form");
      const statusEl = document.getElementById("status");
      const responseEl = document.getElementById("response");
      const button = form.querySelector("button");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        statusEl.textContent = "Sending...";
        button.disabled = true;
        responseEl.textContent = "Waiting for response...";

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        if (payload.guests) {
          payload.guests = Number(payload.guests);
        }

        try {
          const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          responseEl.textContent = JSON.stringify(data, null, 2);
          statusEl.textContent = response.ok ? "Done" : "Request failed";
        } catch (error) {
          responseEl.textContent = String(error);
          statusEl.textContent = "Error";
        } finally {
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`);
});

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!message) {
    return res.status(400).json({ error: "message_required" });
  }

  const language = detectLanguage(message);
  const pms = DEMO_MODE ? cloudbedsMock : cloudbedsApi;

  console.log(`[chat] message received (${language})`);

  try {
    const { intent } = await detectIntent(message);
    console.log(`[chat] intent detected: ${intent}`);

    const params = {
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      roomType: payload.roomType,
    };

    let pmsData = null;
    let pmsIssue = null;
    let missingFields = [];

    if (intent === "availability") {
      pmsData = await pms.getAvailability(params);
    } else if (intent === "pricing") {
      pmsData = await pms.getPricing(params);
    } else if (intent === "rooms_info") {
      pmsData = await pms.getRooms();
    } else if (intent === "faq") {
      pmsData = await pms.getPolicies();
    }

    if (pmsData && pmsData.ok === false) {
      if (Array.isArray(pmsData.missingFields)) {
        missingFields = pmsData.missingFields;
        pmsIssue = "missing_fields";
        console.log(`[chat] missing fields: ${missingFields.join(", ")}`);
      } else if (pmsData.error === "invalid_dates") {
        pmsIssue = "invalid_dates";
        console.log("[chat] invalid date range provided");
      } else {
        pmsIssue = pmsData.error || "pms_unavailable";
        console.log(`[chat] pms error: ${pmsIssue}`);
      }

      pmsData = null;
    }

    const context = {
      hotel: HOTEL_NAME,
      intent,
      language,
      request: params,
      pmsStatus: pmsData ? "ok" : pmsIssue || "not_needed",
      missingFields,
      data: pmsData,
    };

    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Context data (JSON): ${JSON.stringify(context)}`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.log("[chat] empty response from model");
      return res.status(500).json({ error: "empty_model_response" });
    }

    return res.json({ reply, intent, language });
  } catch (error) {
    if (error?.code === "OPENAI_API_KEY_MISSING") {
      console.error("[chat] OpenAI API key missing");
      return res.status(503).json({
        error: "openai_api_key_missing",
        message: "Set OPENAI_API_KEY in your .env file or environment.",
      });
    }

    console.error("[chat] error", error);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
