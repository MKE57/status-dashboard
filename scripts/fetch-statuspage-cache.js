const fs = require("node:fs/promises");
const path = require("node:path");

const ADYEN = {
  provider: "Adyen",
  statusPage: "https://status.adyen.com/",
  outputPath: path.join("data", "adyen.json")
};

const ADYEN_COMPONENTS = [
  "Payments",
  "Payment methods and issuers",
  "Interfaces and reporting",
  "Settlement and payouts",
  "Adyen for Platforms",
  "Financial products"
];

function nowIso() {
  return new Date().toISOString();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function getComponentStatuses(text) {
  const statuses = [];

  for (const name of ADYEN_COMPONENTS) {
    const pattern = new RegExp(`${escapeRegExp(name)}\\s+(Operational|Degraded performance|Severely degraded performance)`, "i");
    const match = text.match(pattern);
    if (match) {
      statuses.push({
        name,
        status: match[1]
      });
    }
  }

  return statuses;
}

function extractActiveIncidentText(text) {
  const activeIndex = text.toLowerCase().indexOf("active incidents");
  if (activeIndex === -1) return "";

  const afterActive = text.slice(activeIndex + "active incidents".length).trim();
  const endMarkers = [
    "Go to incident history",
    "Incident history",
    "Go to adyen.com",
    "Privacy",
    "Cookies",
    "Disclaimer"
  ];

  let endIndex = afterActive.length;
  for (const marker of endMarkers) {
    const markerIndex = afterActive.toLowerCase().indexOf(marker.toLowerCase());
    if (markerIndex !== -1) endIndex = Math.min(endIndex, markerIndex);
  }

  return afterActive.slice(0, endIndex).trim();
}

function buildIncident(name, impact) {
  const timestamp = nowIso();
  return {
    name,
    body: "Detected from Adyen public status page scrape.",
    status: "active",
    impact,
    created_at: timestamp,
    updated_at: timestamp,
    incident_updates: [
      {
        body: "Detected from Adyen public status page scrape."
      }
    ]
  };
}

function determineAdyenPayloadFromHtml(html) {
  const text = stripHtml(html);

  const hasExpectedMarkers =
    text.includes("Payments") &&
    text.includes("Active incidents") &&
    (
      text.includes("Operational") ||
      text.includes("Degraded performance") ||
      text.includes("Severely degraded performance")
    );

  if (!hasExpectedMarkers) {
    throw new Error("Adyen status page HTML did not contain expected status markers. Page may be blocked or changed.");
  }

  const componentStatuses = getComponentStatuses(text);
  if (!componentStatuses.length) {
    throw new Error("Adyen status page scrape did not find any recognised service rows.");
  }

  const severeComponents = componentStatuses.filter(item => item.status.toLowerCase() === "severely degraded performance");
  const degradedComponents = componentStatuses.filter(item => item.status.toLowerCase() === "degraded performance");
  const activeIncidentText = extractActiveIncidentText(text);
  const saysAllOperational = /all services are operational/i.test(activeIncidentText);

  let status = "Operational";
  const activeIncidents = [];

  if (severeComponents.length) {
    status = "Major incident";
    activeIncidents.push(buildIncident(
      `Adyen reports severely degraded performance: ${severeComponents.map(item => item.name).join(", ")}`,
      "major"
    ));
  } else if (degradedComponents.length) {
    status = "Active incident";
    activeIncidents.push(buildIncident(
      `Adyen reports degraded performance: ${degradedComponents.map(item => item.name).join(", ")}`,
      "minor"
    ));
  } else if (activeIncidentText && !saysAllOperational) {
    status = "Active incident";
    activeIncidents.push(buildIncident(`Adyen active incident: ${activeIncidentText}`, "minor"));
  }

  return {
    provider: ADYEN.provider,
    cacheStatus: "ok",
    source: ADYEN.statusPage,
    statusPage: ADYEN.statusPage,
    fetchedAt: nowIso(),
    sourceUpdatedAt: nowIso(),
    updated: nowIso(),
    status,
    activeIncidents,
    activeMaintenances: [],
    upcomingMaintenances: [],
    recentIncidents: [],
    noticeCount: activeIncidents.length,
    scrapeMode: true,
    componentStatuses
  };
}

function comparablePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload));
  delete clone.fetchedAt;
  delete clone.sourceUpdatedAt;
  delete clone.updated;

  if (Array.isArray(clone.activeIncidents)) {
    clone.activeIncidents = clone.activeIncidents.map(incident => {
      const copy = { ...incident };
      delete copy.created_at;
      delete copy.updated_at;
      return copy;
    });
  }

  return clone;
}

async function writeJsonFileIfChanged(outputPath, payload) {
  try {
    const existingRaw = await fs.readFile(outputPath, "utf8");
    const existing = JSON.parse(existingRaw);

    if (JSON.stringify(comparablePayload(existing)) === JSON.stringify(comparablePayload(payload))) {
      console.log(`${payload.provider} cache checked. No material status change.`);
      return false;
    }
  } catch (error) {
    console.log(`${payload.provider} existing cache could not be compared. Writing cache file.`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return true;
}

async function main() {
  const fetchedAt = nowIso();

  try {
    const html = await fetchText(ADYEN.statusPage);
    const payload = determineAdyenPayloadFromHtml(html);
    await writeJsonFileIfChanged(ADYEN.outputPath, payload);
    console.log(`Adyen cache checked: ${payload.status}; activeIncidents=${payload.activeIncidents.length}`);
  } catch (error) {
    const payload = {
      provider: ADYEN.provider,
      cacheStatus: "error",
      source: ADYEN.statusPage,
      statusPage: ADYEN.statusPage,
      fetchedAt,
      updated: fetchedAt,
      status: "Unable to fetch",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents: [],
      error: error && error.message ? error.message : String(error),
      scrapeMode: true
    };

    await writeJsonFileIfChanged(ADYEN.outputPath, payload);
    console.error("Adyen cache update failed:", payload.error);
  }
}

main();
