const fs = require("node:fs/promises");
const path = require("node:path");

const PROVIDERS = [
  {
    name: "Adyen",
    summaryUrl: "https://status.adyen.com/api/v2/summary.json",
    incidentsUrl: "https://status.adyen.com/api/v2/incidents.json",
    statusPage: "https://status.adyen.com/",
    outputPath: path.join("data", "adyen.json")
  },
  {
    name: "ATG Tickets",
    summaryUrl: "https://atgtickets.statuspage.io/api/v2/summary.json",
    incidentsUrl: "https://atgtickets.statuspage.io/api/v2/incidents.json",
    statusPage: "https://atgtickets.statuspage.io/",
    outputPath: path.join("data", "atg-tickets.json")
  }
];

function nowIso() {
  return new Date().toISOString();
}

function itemText(item, field) {
  return item && item[field] ? String(item[field]).toLowerCase() : "";
}

function latestUpdateBody(item) {
  return (item && item.incident_updates && item.incident_updates[0] && item.incident_updates[0].body) || item.body || "";
}

function isMaintenanceNotice(item) {
  const name = itemText(item, "name");
  const status = itemText(item, "status");
  const impact = itemText(item, "impact");
  const body = latestUpdateBody(item).toLowerCase();

  return name.includes("scheduled maintenance") ||
    name.includes("maintenance notice") ||
    name.includes("upcoming maintenance") ||
    name.includes("maintenance") ||
    impact === "maintenance" ||
    body.includes("scheduled maintenance") ||
    body.includes("system maintenance") ||
    status === "scheduled" ||
    status.includes("maintenance");
}

function dateValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isMaintenanceActive(maintenance) {
  const now = new Date();
  const status = itemText(maintenance, "status");
  const start = dateValue(maintenance.scheduled_for);
  const end = dateValue(maintenance.scheduled_until);

  return status === "in_progress" ||
    status === "verifying" ||
    status === "active" ||
    (start && end && now >= start && now <= end);
}

function isWithinNext24Hours(value) {
  const date = value instanceof Date ? value : dateValue(value);
  if (!date) return false;
  const diff = date - new Date();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

function getMaintenanceDate(maintenance) {
  return dateValue(maintenance.scheduled_for) || dateValue(maintenance.created_at) || dateValue(maintenance.updated_at);
}

function isMaintenanceUpcomingWithin24Hours(maintenance) {
  return !isMaintenanceActive(maintenance) && isWithinNext24Hours(getMaintenanceDate(maintenance));
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const bDate = new Date(b.updated_at || b.resolved_at || b.created_at || 0).getTime();
    const aDate = new Date(a.updated_at || a.resolved_at || a.created_at || 0).getTime();
    return bDate - aDate;
  });
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "ATG-SaaS-Status-Dashboard-Cache/1.0"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function comparablePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload));
  delete clone.fetchedAt;
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

async function fetchProvider(provider) {
  const fetchedAt = nowIso();

  try {
    const summaryData = await fetchJson(provider.summaryUrl);

    let incidentsData = { incidents: [] };
    try {
      incidentsData = await fetchJson(provider.incidentsUrl);
    } catch (incidentError) {
      console.warn(`${provider.name} incidents endpoint unavailable. Continuing with summary data only.`, incidentError.message || incidentError);
    }

    const rawIncidents = Array.isArray(summaryData.incidents) ? summaryData.incidents : [];
    const scheduledMaintenances = Array.isArray(summaryData.scheduled_maintenances) ? summaryData.scheduled_maintenances : [];
    const maintenanceNotices = rawIncidents.filter(isMaintenanceNotice);

    const activeIncidents = rawIncidents.filter(incident => !isMaintenanceNotice(incident));
    const activeMaintenances = scheduledMaintenances.filter(isMaintenanceActive);
    const upcomingMaintenances = scheduledMaintenances.filter(isMaintenanceUpcomingWithin24Hours);
    const recentIncidents = Array.isArray(incidentsData.incidents) ? sortNewestFirst(incidentsData.incidents).slice(0, 10) : [];

    const payload = {
      provider: provider.name,
      cacheStatus: "ok",
      source: provider.summaryUrl,
      incidentsSource: provider.incidentsUrl,
      statusPage: provider.statusPage,
      fetchedAt,
      sourceUpdatedAt: summaryData.page?.updated_at || fetchedAt,
      updated: summaryData.page?.updated_at || fetchedAt,
      status: summaryData.status?.description || "Operational",
      activeIncidents,
      activeMaintenances,
      upcomingMaintenances,
      recentIncidents,
      noticeCount: activeIncidents.length + activeMaintenances.length + upcomingMaintenances.length + recentIncidents.length,
      summaryIndicator: summaryData.status?.indicator || "none",
      componentCount: Array.isArray(summaryData.components) ? summaryData.components.length : 0
    };

    await writeJsonFileIfChanged(provider.outputPath, payload);
    console.log(`${provider.name} cache checked: ${payload.status}; activeIncidents=${activeIncidents.length}`);
  } catch (error) {
    const payload = {
      provider: provider.name,
      cacheStatus: "error",
      source: provider.summaryUrl,
      incidentsSource: provider.incidentsUrl,
      statusPage: provider.statusPage,
      fetchedAt,
      updated: fetchedAt,
      status: "Unable to fetch",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents: [],
      error: error && error.message ? error.message : String(error)
    };

    await writeJsonFileIfChanged(provider.outputPath, payload);
    console.error(`${provider.name} cache update failed:`, payload.error);
  }
}

async function main() {
  for (const provider of PROVIDERS) {
    await fetchProvider(provider);
  }
}

main();
