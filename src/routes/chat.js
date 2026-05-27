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
          <textarea name="message" required>Bonjour, avez-vous une suite du 21 au 23 janvier 2026 ?</textarea>
        </label>
        <div class="row">
          <label>
            Check-in
            <input
              name="checkIn"
              type="date"
              value="2026-01-21"
              placeholder="2026-01-21"
            />
          </label>
          <label>
            Check-out
            <input
              name="checkOut"
              type="date"
              value="2026-01-23"
              placeholder="2026-01-23"
            />
          </label>
          <label>
            Guests
            <input name="guests" type="number" min="1" value="2" placeholder="2" />
          </label>
          <label>
            Room type
            <select name="roomType">
              <option value="Junior" selected>Junior</option>
              <option value="Suite">Suite</option>
              <option value="Suite Doble">Suite Doble</option>
            </select>
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
  const clientId =
    typeof payload.clientId === "string" && payload.clientId.trim()
      ? payload.clientId.trim().toLowerCase()
      : "suitesmine";

  if (!message) {
    return res.status(400).json({ error: "message_required" });
  }

  const language = detectLanguage(message);

  if (clientId === "securyti") {
    const normalizedMessage = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const hasNetworkProblem =
      /\bred\b/.test(normalizedMessage) &&
      /\b(problema|problemas|seguridad|contactar|contacto|urgente|urge|alguien|ayuda)\b/.test(
        normalizedMessage,
      );
    const asksForContact =
      /\b(quien|con quien|asesor|persona|hablar|contactar|contacto|telefono|email|correo)\b/.test(
        normalizedMessage,
      ) &&
      /\b(hablar|contactar|contacto|llamar|escribir|asesor|ayuda|puedo)\b/.test(
        normalizedMessage,
      );

    if (asksForContact) {
      return res.json({
        reply:
          "Puedes hablar directamente con SecuryTI en contacto@securyti.mx.\n\nTambién puedes llamar al 5538352101.",
        intent: "handoff",
        language,
      });
    }

    if (hasNetworkProblem) {
      return res.json({
        reply:
          "Para problemas con una red, puedes contactar a SecuryTI en contacto@securyti.mx.\n\nEn caso de urgencia, llama al 5538352101.",
        intent: "handoff",
        language,
      });
    }

    const securytiPrompt = `You are Olivia, the SecuryTI AI assistant.
Reply only in the visitor's language. If unclear, reply in Spanish.

SecuryTI knowledge:
- SecuryTI provides cybersecurity services for companies in CDMX and Mexico.
- Contact: contacto@securyti.mx.
- Emergency phone: 5538352101.
- Services: NIST Cybersecurity Framework diagnosis/accreditation, cybersecurity audits, technology consulting, compliance support such as NIST and ISO 27001, digital forensic reports, cybersecurity training, penetration testing, network security, endpoint protection, threat intelligence, ransomware/phishing guidance, and incident response.
- NIST offer: fast diagnosis based on NIST CSF for Mexican SMEs working or planning to work with customers in the United States and Canada; the site presents it as a 48-hour evaluation with verifiable digital accreditation on blockchain.

Behavior:
- Answer naturally as an AI assistant, not as a rigid menu.
- Keep replies concise, useful, and commercial.
- If the visitor says hello, greet and ask what cybersecurity topic they need help with.
- If the visitor asks a broad question, ask one clarifying question.
- If they ask about prices, explain that pricing depends on scope and invite them to share company, need, urgency, email and phone.
- Never invent prices, guarantees, legal conclusions, or certifications.`;

    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: securytiPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "empty_model_response" });
    }

    return res.json({ reply, intent: "faq", language });
  }

  if (clientId === "gescom") {
    const normalizedMessage = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const asksForContact =
      /\b(contact|contacter|courriel|email|mail|telephone|tel|appeler|parler|joindre|rendez|rdv|devis)\b/.test(
        normalizedMessage,
      );

    if (asksForContact) {
      return res.json({
        reply:
          "Vous pouvez contacter GESCOM directement par courriel à gescom.mauricie@gmail.com ou par téléphone au +1 (819) 996-1177.",
        intent: "handoff",
        language,
      });
    }

    const gescomPrompt = `You are Sophie, the GESCOM AI assistant.
Reply only in the visitor's language. If unclear, reply in French.

GESCOM knowledge:
- GESCOM is founded by Aurelie Genin and provides remote administrative assistant services for entrepreneurs, freelancers, SMEs and small businesses in Mauricie, Quebec.
- Areas served include Mauricie, Trois-Rivieres, Shawinigan and Saint-Elie-de-Caxton.
- Contact email: gescom.mauricie@gmail.com.
- Contact phone: +1 (819) 996-1177.
- Services: administrative management, quotes and invoicing, document organization and filing, professional email management, client follow-up, commercial document support, externalized administrative assistance.
- Positioning: flexible, rigorous, confidential and professional administrative support so business owners can free their time and focus on their core work.

Behavior:
- Answer naturally as Sophie, not as a rigid menu.
- Keep replies concise, warm and commercial.
- If the visitor asks broadly, ask one useful clarifying question.
- If the visitor wants contact, a quote, pricing or a meeting, give the email and phone directly and invite them to leave their name, email, phone and need.
- Do not invent prices, contracts, legal claims or availability.`;

    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: gescomPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "empty_model_response" });
    }

    return res.json({ reply, intent: "faq", language });
  }

  if (clientId === "kabin") {
    const normalizedMessage = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const asksForContact =
      /\b(contact|contacto|correo|email|mail|telefono|tel|whatsapp|hablar|asesor|asesoria|cotizacion|cotizar|quote|contactar)\b/.test(
        normalizedMessage,
      );
    const asksIdentity =
      /\b(quien eres|como te llamas|tu nombre|who are you|your name)\b/.test(normalizedMessage);

    if (asksIdentity) {
      const reply =
        language === "en"
          ? "I am Olivia, Kabin's AI assistant. I can help you with accounting, tax, financial, asset-management and corporate consulting questions."
          : "Soy Olivia, la asistente IA de Kabin. Puedo ayudarte con dudas de consultoría contable, fiscal, financiera, patrimonial y corporativa.";
      return res.json({ reply, intent: "faq", language });
    }

    if (asksForContact) {
      const reply =
        language === "en"
          ? "You can contact Kabin directly at contacto@kabinconsultores.com. If you prefer, leave your name, email, phone, and the service you need so an advisor can follow up."
          : "Puedes contactar directamente a Kabin en contacto@kabinconsultores.com. Si lo prefieres, deja tu nombre, correo, teléfono y el servicio que necesitas para que un asesor te dé seguimiento.";
      return res.json({ reply, intent: "handoff", language });
    }

    const kabinPrompt = `You are Olivia, the Kabin AI assistant.
Reply only in the visitor's language. If unclear, reply in Spanish.

Kabin knowledge:
- Kabin Consultores provides tax, accounting, financial, asset-management and corporate consulting services in Mexico.
- Contact email: contacto@kabinconsultores.com.
- Positioning: professional services from a human perspective; behind every number there is a human story, a family, a company, and an important decision.
- Mission: personalized advisory and warm, human, responsible, professional support so each client can understand their situation and make decisions calmly.
- Vision: become a leading accounting, tax and financial consulting firm focused on protecting and growing client assets.
- Values: responsibility, honesty, empathy, teamwork.
- Services in Spanish: contabilidad; auditorias e informes financieros; claridad operativa; fiscal / impuestos; estrategia y cumplimiento; mitigacion de riesgos; gestion patrimonial; proteccion y crecimiento de activos; seguridad del legado; legal / corporativo; gobierno corporativo; integridad estructural.
- Services in English: accounting; audits and financial reports; operational clarity; tax and financial consulting; asset protection and growth; corporate governance.

Behavior:
- Answer naturally as Olivia, not as a rigid menu.
- Keep replies concise, human, professional and commercial.
- If the visitor asks broadly, ask one clarifying question before listing everything.
- If the visitor asks for contact, quote, pricing, WhatsApp or an advisor, give contacto@kabinconsultores.com directly and invite them to leave name, email, phone and service needed.
- Do not invent prices, tax/legal conclusions, guarantees, certifications, phone numbers or WhatsApp numbers.`;

    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: kabinPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "empty_model_response" });
    }

    return res.json({ reply, intent: "faq", language });
  }

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

    const isOpenAIError =
      error?.name?.includes("OpenAI") ||
      error?.status ||
      error?.error?.type ||
      error?.error?.message;
    const isDebug = process.env.NODE_ENV !== "production";

    if (isOpenAIError) {
      console.error("[chat] openai error", error);
      return res.status(502).json({
        error: "openai_error",
        ...(isDebug
          ? {
              status: error.status,
              message: error.message,
              code: error.code,
              type: error.type || error.error?.type,
            }
          : {}),
      });
    }

    console.error("[chat] error", error);
    return res.status(500).json({
      error: "internal_error",
      ...(isDebug ? { message: error.message } : {}),
    });
  }
});

export default router;
