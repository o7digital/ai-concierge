const BASE_URL =
  process.env.CLOUDBEDS_BASE_URL || "https://hotels.cloudbeds.com/api/v1.2";
const PROPERTY_ID = process.env.CLOUDBEDS_PROPERTY_ID;

const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID;
const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.CLOUDBEDS_ACCESS_TOKEN;
const API_KEY = process.env.CLOUDBEDS_API_KEY;

const TOKEN_URL = process.env.CLOUDBEDS_TOKEN_URL || `${BASE_URL}/access_token`;

const PROPERTY_ID_PARAM = process.env.CLOUDBEDS_PROPERTY_ID_PARAM || "propertyID";
const API_KEY_PARAM = process.env.CLOUDBEDS_API_KEY_PARAM || "key";
const ACCESS_TOKEN_PARAM =
  process.env.CLOUDBEDS_ACCESS_TOKEN_PARAM || "access_token";

const ENDPOINT_AVAILABILITY =
  process.env.CLOUDBEDS_ENDPOINT_AVAILABILITY || "getAvailability";
const ENDPOINT_ROOMS = process.env.CLOUDBEDS_ENDPOINT_ROOMS || "getRooms";
const ENDPOINT_POLICIES =
  process.env.CLOUDBEDS_ENDPOINT_POLICIES || "getPolicies";
const ENDPOINT_PRICING = process.env.CLOUDBEDS_ENDPOINT_PRICING || "getRates";

const PARAM_START_DATE = process.env.CLOUDBEDS_PARAM_START_DATE || "start_date";
const PARAM_END_DATE = process.env.CLOUDBEDS_PARAM_END_DATE || "end_date";
const PARAM_ADULTS = process.env.CLOUDBEDS_PARAM_ADULTS || "adults";
const PARAM_ROOM_TYPE = process.env.CLOUDBEDS_PARAM_ROOM_TYPE || "roomTypeID";

const DEBUG = String(process.env.DEBUG_CLOUDBEDS || "").toLowerCase() === "true";

function debugLog(...args) {
  if (DEBUG) {
    console.log("[cloudbeds:debug]", ...args);
  }
}

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function buildUrl(path) {
  const base = BASE_URL.replace(/\/+$/, "");
  const suffix = String(path || "").replace(/^\/+/, "");
  return `${base}/${suffix}`;
}

function ensureConfigured() {
  if (!PROPERTY_ID) {
    debugLog("configuration missing property id");
    return { ok: false, error: "cloudbeds_property_id_missing" };
  }

  if (ACCESS_TOKEN || API_KEY) {
    return { ok: true };
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    debugLog("configuration missing client id/secret");
    return { ok: false, error: "cloudbeds_credentials_missing" };
  }

  return { ok: true };
}

async function fetchAccessToken() {
  if (ACCESS_TOKEN) {
    return ACCESS_TOKEN;
  }

  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 30_000) {
    debugLog("using cached access token, expiresAt", tokenCache.expiresAt);
    return tokenCache.accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    debugLog("cannot fetch token: missing client id/secret");
    return null;
  }

  debugLog("fetching access token", {
    tokenUrl: TOKEN_URL,
    clientId: CLIENT_ID ? `${CLIENT_ID.slice(0, 4)}...` : null,
  });

  let response;
  let data = {};

  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    data = await response.json().catch(() => ({}));
  } catch (error) {
    console.error("[cloudbeds] token fetch failed", error);
    debugLog("token fetch threw", error?.message);
    return null;
  }

  if (!response?.ok) {
    console.error("[cloudbeds] token response error", {
      status: response?.status,
      data,
    });
    debugLog("token response not ok", {
      status: response?.status,
      body: data,
    });
    return null;
  }

  const accessToken =
    data.access_token || data.accessToken || data.token || data.data?.access_token;
  const expiresIn = Number(data.expires_in || data.expiresIn || 3600);

  if (!accessToken) {
    return null;
  }

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
}

async function requestCloudbeds(endpoint, params = {}) {
  const configStatus = ensureConfigured();
  if (!configStatus.ok) {
    return configStatus;
  }

  debugLog("request start", {
    endpoint,
    propertyId: PROPERTY_ID,
    baseUrl: BASE_URL,
    params,
    authMode: API_KEY ? "api_key" : ACCESS_TOKEN ? "access_token" : "oauth_client_credentials",
  });

  const url = new URL(buildUrl(endpoint));
  const query = new URLSearchParams();

  query.set(PROPERTY_ID_PARAM, PROPERTY_ID);

  if (API_KEY) {
    query.set(API_KEY_PARAM, API_KEY);
  } else {
    const token = await fetchAccessToken();
    if (!token) {
      return { ok: false, error: "cloudbeds_token_error" };
    }
    query.set(ACCESS_TOKEN_PARAM, token);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  url.search = query.toString();

  let response;
  let data = {};

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    data = await response.json().catch(() => ({}));
  } catch (error) {
    console.error("[cloudbeds] request failed", error);
    debugLog("fetch error", error?.message);
    return {
      ok: false,
      error: "cloudbeds_fetch_failed",
      message: error?.message || "request_failed",
    };
  }

  if (!response?.ok) {
    console.error("[cloudbeds] response error", {
      status: response?.status,
      data,
    });
    debugLog("response not ok", {
      status: response?.status,
      body: data,
      url: url.toString().replace(/access_token=[^&]+/i, "access_token=[masked]"),
    });
    return {
      ok: false,
      error: "cloudbeds_api_error",
      status: response?.status,
      data,
    };
  }

  debugLog("response ok", {
    status: response?.status,
    url: url.toString().replace(/access_token=[^&]+/i, "access_token=[masked]"),
    sample: typeof data === "object" ? JSON.stringify(data).slice(0, 300) : data,
  });

  return { ok: true, data };
}

function mapAvailabilityParams(params = {}) {
  const mapped = {};

  if (params.checkIn) {
    mapped[PARAM_START_DATE] = params.checkIn;
  }
  if (params.checkOut) {
    mapped[PARAM_END_DATE] = params.checkOut;
  }
  if (params.guests) {
    mapped[PARAM_ADULTS] = params.guests;
  }
  if (params.roomType) {
    mapped[PARAM_ROOM_TYPE] = params.roomType;
  }

  return mapped;
}

export async function getAvailability(params = {}) {
  return requestCloudbeds(ENDPOINT_AVAILABILITY, mapAvailabilityParams(params));
}

export async function getRooms() {
  return requestCloudbeds(ENDPOINT_ROOMS);
}

export async function getPolicies() {
  return requestCloudbeds(ENDPOINT_POLICIES);
}

export async function getPricing(params = {}) {
  return requestCloudbeds(ENDPOINT_PRICING, mapAvailabilityParams(params));
}
