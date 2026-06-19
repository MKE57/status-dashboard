const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const ADYEN = {
  provider: "Adyen",
  statusPage: "https://status.adyen.com/",
  historyPage: "https://status.adyen.com/incident-history#2026",
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

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

function nowIso() {
  return new Date().toISOString();
}

function normaliseText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseLines(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function dismissCookieBanner(page) {
  const buttonPatterns = [
    /Reject all cookies/i,
    /Accept all cookies/i,
    /Accept/i,
    /Reject/i,
    /Close/i
  ];

  for (const pattern of buttonPatterns) {
    try {
      const button = page.getByRole("button", { name: pattern }).first();
      if (await button.count()) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(500);
        return;
      }
    } catch (_) {
      // Cookie banners vary; ignore and continue.
    }
  }
}

async function getRenderedText(url, markerText) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1400 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
      locale: "en-GB",
      extraHTTPHeaders: {
        "Accept-Language": "en-GB,en;q=0.9"
      }
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissCookieBanner(page);

    if (markerText) {
      try {
        await page.waitForFunction(marker => document.body && document.body.innerText && document.body.innerText.includes(marker), markerText, { timeout: 20000 });
      } catch (_) {
        // Continue anyway; validation decides success/failure.
      }
    }

    await page.waitForTimeout(3000);
    return await page.locator("body").innerText({ timeout: 10000 });
  } finally {
    await browser.close();
  }
}

function getComponentStatuses(text) {
  const compactText = normaliseText(text);
  const statuses = [];

  for (const name of ADYEN_COMPONENTS) {
    const pattern = new RegExp(`${escapeRegExp(name)}\\s+(Operational|Degraded performance|Severely degraded performance)`, "i");
    const match = compactText.match(pattern);
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
  const compactText = normaliseText(text);
  const activeIndex = compactText.toLowerCase().indexOf("active incidents");
  if (activeIndex === -1) return "";

  const afterActive = compactText.slice(activeIndex + "active incidents".length).trim();
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
    body: "Detected from rendered Adyen public status page scrape.",
    status: "active",
    impact,
    created_at: timestamp,
    updated_at: timestamp,
    incident_updates: [
      {
        body: "Detected from rendered Adyen public status page scrape."
      }
    ]
  };
}

function parseAdyenHistoryDate(value) {
  const match = String(value || "").match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s+(CEST|CET|UTC|GMT|BST)/i);
  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const zone = match[6].toUpperCase();

  const offsets = {
    CEST: 2,
    CET: 1,
    BST: 1,
    GMT: 0,
    UTC: 0
  };

  const offset = offsets[zone] ?? 0;
  return new Date(Date.UTC(year, month, day, hour - offset, minute)).toISOString();
}

function isLikelyIncidentTitle(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(2026|2025|2024|June|May|April|March|February|January|Show all incidents|Back to Service status|Incident history|Service status|Maintenance|History)$/i.test(text)) return false;
  if (ADYEN_COMPONENTS.some(component => component.toLowerCase() === text.toLowerCase())) return false;
  if (/^(Contact Support|Help center|Adyen|STATUS)$/i.test(text)) return false;
  return text.length >= 8;
}

function parseHistoryIncidents(historyText) {
  const lines = normaliseLines(historyText);
  const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s+\d{4},\s+\d{1,2}:\d{2}\s+(CEST|CET|UTC|GMT|BST)/i;
  const incidents = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const dateText = dateMatch[0];
    const parsedDate = parseAdyenHistoryDate(dateText) || nowIso();
    let title = line.slice(0, dateMatch.index).trim();

    if (!isLikelyIncidentTitle(title)) {
      for (let back = index - 1; back >= Math.max(0, index - 5); back -= 1) {
        if (isLikelyIncidentTitle(lines[back])) {
          title = lines[back];
          break;
        }
      }
    }

    if (!isLikelyIncidentTitle(title)) continue;

    let component = "";
    for (let forward = index + 1; forward <= Math.min(lines.length - 1, index + 4); forward += 1) {
      const possible = lines[forward];
      if (ADYEN_COMPONENTS.some(componentName => componentName.toLowerCase() === possible.toLowerCase())) {
        component = possible;
        break;
      }
    }

    const key = `${title}|${parsedDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    incidents.push({
      name: title,
      body: component ? `Component: ${component}` : "Detected from Adyen incident history page scrape.",
      status: "resolved",
      impact: "minor",
      created_at: parsedDate,
      updated_at: parsedDate,
      resolved_at: parsedDate,
      incident_updates: [
        {
          body: component ? `Component: ${component}` : "Detected from Adyen incident history page scrape."
        }
      ]
    });
  }

  return incidents
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 10);
}

function determineAdyenPayloadFromText(statusText, historyText) {
  const compactStatusText = normaliseText(statusText);
  const hasExpectedMarkers =
    compactStatusText.includes("Payments") &&
    compactStatusText.includes("Active incidents") &&
    (
      compactStatusText.includes("Operational") ||
      compactStatusText.includes("Degraded performance") ||
      compactStatusText.includes("Severely degraded performance")
    );

  if (!hasExpectedMarkers) {
    const sample = compactStatusText.slice(0, 500);
    throw new Error(`Rendered Adyen status page did not contain expected status markers. Sample: ${sample}`);
  }

  const componentStatuses = getComponentStatuses(statusText);
  if (!componentStatuses.length) {
    const sample = compactStatusText.slice(0, 500);
    throw new Error(`Rendered Adyen status page did not expose recognised service rows. Sample: ${sample}`);
  }

  const severeComponents = componentStatuses.filter(item => item.status.toLowerCase() === "severely degraded performance");
  const degradedComponents = componentStatuses.filter(item => item.status.toLowerCase() === "degraded performance");
  const activeIncidentText = extractActiveIncidentText(statusText);
  const saysAllOperational = /all services are operational/i.test(activeIncidentText);
  const recentIncidents = parseHistoryIncidents(historyText);

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
    historySource: ADYEN.historyPage,
    statusPage: ADYEN.statusPage,
    fetchedAt: nowIso(),
    sourceUpdatedAt: nowIso(),
    updated: nowIso(),
    status,
    activeIncidents,
    activeMaintenances: [],
    upcomingMaintenances: [],
    recentIncidents,
    noticeCount: activeIncidents.length + recentIncidents.length,
    scrapeMode: "playwright-rendered-page-with-history",
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
  } catch (_) {
    console.log(`${payload.provider} existing cache could not be compared. Writing cache file.`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return true;
}

async function main() {
  const fetchedAt = nowIso();

  try {
    const statusText = await getRenderedText(ADYEN.statusPage, "Service status");
    const historyText = await getRenderedText(ADYEN.historyPage, "Incident history");
    const payload = determineAdyenPayloadFromText(statusText, historyText);
    await writeJsonFileIfChanged(ADYEN.outputPath, payload);
    console.log(`Adyen cache checked: ${payload.status}; activeIncidents=${payload.activeIncidents.length}; recentIncidents=${payload.recentIncidents.length}`);
  } catch (error) {
    const payload = {
      provider: ADYEN.provider,
      cacheStatus: "error",
      source: ADYEN.statusPage,
      historySource: ADYEN.historyPage,
      statusPage: ADYEN.statusPage,
      fetchedAt,
      updated: fetchedAt,
      status: "Unable to fetch",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents: [],
      error: error && error.message ? error.message : String(error),
      scrapeMode: "playwright-rendered-page-with-history"
    };

    await writeJsonFileIfChanged(ADYEN.outputPath, payload);
    console.error("Adyen cache update failed:", payload.error);
  }
}

main();
