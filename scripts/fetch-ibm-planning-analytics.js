const fs = require("node:fs/promises");
const path = require("node:path");

const IBM_NOTICES_URL = "https://status.ai-apps-comms.ibm.com/announcement/iotm/api/v1/ext/1nS00axYWJZEkaNISKwKAi4ZaLCXam495VbYfjO6y%2BM%3D/notices.json";
const OUTPUT_PATH = path.join("data", "ibm-planning-analytics.json");
const STATUS_PAGE = "https://status.ai-apps-comms.ibm.com/planninganalytics";

function nowIso() {
  return new Date().toISOString();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function valueFromPath(source, dotPath) {
  return dotPath.split(".").reduce((value, key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) return value[key];
    return undefined;
  }, source);
}

function firstPath(source, paths) {
  for (const dotPath of paths) {
    const value = valueFromPath(source, dotPath);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latestUpdateBody(item) {
  return (item && item.incident_updates && item.incident_updates[0] && item.incident_updates[0].body) || item.body || "";
}

function itemText(item, field) {
  return item && item[field] ? String(item[field]).toLowerCase() : "";
}

function normaliseNotice(notice) {
  const title = firstPath(notice, [
    "title", "name", "summary", "subject", "notificationTitle", "headline", "eventTitle", "shortDescription", "attributes.title"
  ]) || "IBM notice";

  const body = stripHtml(firstPath(notice, [
    "description", "body", "message", "notificationContent", "content", "details", "longDescription", "attributes.description", "attributes.body"
  ]) || "");

  const status = firstPath(notice, ["status", "state", "category", "notificationStatus", "eventStatus", "attributes.status"]) || "";
  const impact = firstPath(notice, ["impact", "severity", "priority", "eventType", "type", "attributes.severity"]) || "";
  const createdAt = firstPath(notice, ["created_at", "createdAt", "creationDate", "createdDate", "startDate", "date", "publishDate", "published", "attributes.createdAt"]);
  const updatedAt = firstPath(notice, ["updated_at", "updatedAt", "lastUpdated", "modifiedDate", "updateDate", "updated", "attributes.updatedAt"]) || createdAt;
  const scheduledFor = firstPath(notice, ["scheduled_for", "scheduledFor", "start_time", "startTime", "startDate", "plannedStartTime", "eventStartTime", "attributes.startTime"]);
  const scheduledUntil = firstPath(notice, ["scheduled_until", "scheduledUntil", "end_time", "endTime", "endDate", "plannedEndTime", "eventEndTime", "attributes.endTime"]);

  return {
    name: stripHtml(title),
    body,
    status: String(status),
    impact: String(impact),
    created_at: toDateValue(createdAt),
    updated_at: toDateValue(updatedAt),
    scheduled_for: toDateValue(scheduledFor),
    scheduled_until: toDateValue(scheduledUntil),
    incident_updates: body ? [{ body }] : []
  };
}

function collectNoticeArrays(value, arrays = []) {
  if (Array.isArray(value)) {
    if (value.some(item => item && typeof item === "object")) arrays.push(value);
    value.forEach(item => collectNoticeArrays(item, arrays));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectNoticeArrays(item, arrays));
  }
  return arrays;
}

function scoreNoticeArray(items) {
  const keys = ["title", "name", "summary", "subject", "description", "body", "message", "status", "severity", "createdAt", "updatedAt", "date"];
  return items.reduce((score, item) => {
    if (!item || typeof item !== "object") return score;
    return score + keys.filter(key => item[key] !== undefined).length;
  }, 0);
}

function getNoticeArray(data) {
  if (Array.isArray(data)) return data;

  const preferred = [
    data?.notices,
    data?.items,
    data?.data,
    data?.notifications,
    data?.announcements,
    data?.results,
    data?.records
  ];

  const direct = preferred.find(Array.isArray);
  if (direct) return direct;

  const arrays = collectNoticeArrays(data).filter(items => items.length > 0);
  if (!arrays.length) return [];

  return arrays.sort((a, b) => scoreNoticeArray(b) - scoreNoticeArray(a))[0];
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

function isResolvedNotice(item) {
  const status = itemText(item, "status");
  const body = latestUpdateBody(item).toLowerCase();

  return status.includes("resolved") ||
    status.includes("closed") ||
    status.includes("complete") ||
    status.includes("completed") ||
    status.includes("cancelled") ||
    body.includes("resolved") ||
    body.includes("has been resolved") ||
    body.includes("completed successfully");
}

function isMajorIncident(item) {
  const impact = itemText(item, "impact");
  const name = itemText(item, "name");
  const status = itemText(item, "status");

  return impact.includes("major") ||
    impact.includes("critical") ||
    name.includes("major") ||
    name.includes("critical") ||
    status.includes("major") ||
    status.includes("critical");
}

function isActiveIncident(item) {
  if (isResolvedNotice(item) || isMaintenanceNotice(item)) return false;

  const status = itemText(item, "status");
  const impact = itemText(item, "impact");
  const name = itemText(item, "name");
  const body = latestUpdateBody(item).toLowerCase();

  return status.includes("active") ||
    status.includes("open") ||
    status.includes("progress") ||
    status.includes("investigating") ||
    impact.includes("critical") ||
    impact.includes("major") ||
    impact.includes("minor") ||
    name.includes("incident") ||
    body.includes("incident") ||
    body.includes("degraded") ||
    body.includes("unavailable") ||
    body.includes("outage") ||
    body.includes("disruption") ||
    body.includes("interruption");
}

function isActiveMaintenance(item) {
  if (!isMaintenanceNotice(item) || isResolvedNotice(item)) return false;

  const status = itemText(item, "status");
  const start = item.scheduled_for ? new Date(item.scheduled_for) : null;
  const end = item.scheduled_until ? new Date(item.scheduled_until) : null;
  const now = new Date();

  return status.includes("progress") ||
    status.includes("active") ||
    status.includes("verifying") ||
    (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && now >= start && now <= end);
}

function isUpcomingMaintenanceWithin24Hours(item) {
  if (!isMaintenanceNotice(item) || isResolvedNotice(item) || isActiveMaintenance(item)) return false;

  const start = item.scheduled_for ? new Date(item.scheduled_for) : null;
  if (!start || Number.isNaN(start.getTime())) return false;

  const diff = start.getTime() - Date.now();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
    const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
    return bDate - aDate;
  });
}

function determineStatus(activeIncidents, activeMaintenances, upcomingMaintenances) {
  if (activeIncidents.some(isMajorIncident)) return "Major incident";
  if (activeIncidents.length > 0) return "Active incident";
  if (activeMaintenances.length > 0) return "Maintenance";
  if (upcomingMaintenances.length > 0) return "Upcoming maintenance";
  return "Operational";
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
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
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function writeJsonFile(payload) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function comparablePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload));

  // Exclude check-time-only values so the workflow does not commit every 5 minutes.
  delete clone.fetchedAt;

  return clone;
}

async function writeJsonFileIfChanged(payload) {
  try {
    const existingRaw = await fs.readFile(OUTPUT_PATH, "utf8");
    const existing = JSON.parse(existingRaw);

    const existingComparable = JSON.stringify(comparablePayload(existing));
    const nextComparable = JSON.stringify(comparablePayload(payload));

    if (existingComparable === nextComparable) {
      console.log("IBM Planning Analytics cache checked. No material status change.");
      return false;
    }
  } catch (error) {
    console.log("Existing IBM cache could not be compared. Writing new cache file.");
  }

  await writeJsonFile(payload);
  return true;
}

async function main() {
  const fetchedAt = nowIso();

  try {
    const response = await fetchWithTimeout(IBM_NOTICES_URL);
    const data = await response.json();
    const notices = getNoticeArray(data).map(normaliseNotice);

    const activeIncidents = notices.filter(isActiveIncident);
    const activeMaintenances = notices.filter(isActiveMaintenance);
    const upcomingMaintenances = notices.filter(isUpcomingMaintenanceWithin24Hours);
    const recentIncidents = sortNewestFirst(notices.filter(item => !isMaintenanceNotice(item))).slice(0, 10);
    const sortedNotices = sortNewestFirst(notices);
    const updated = sortedNotices[0]?.updated_at || sortedNotices[0]?.created_at || fetchedAt;

    const payload = {
      provider: "IBM Planning Analytics",
      cacheStatus: "ok",
      source: IBM_NOTICES_URL,
      statusPage: STATUS_PAGE,
      fetchedAt,
      sourceUpdatedAt: updated,
      updated,
      status: determineStatus(activeIncidents, activeMaintenances, upcomingMaintenances),
      activeIncidents,
      activeMaintenances,
      upcomingMaintenances,
      recentIncidents,
      noticeCount: notices.length
    };

    await writeJsonFileIfChanged(payload);
    console.log(`IBM Planning Analytics cache updated: ${payload.status}; notices=${notices.length}; activeIncidents=${activeIncidents.length}`);
  } catch (error) {
    const payload = {
      provider: "IBM Planning Analytics",
      cacheStatus: "error",
      source: IBM_NOTICES_URL,
      statusPage: STATUS_PAGE,
      fetchedAt,
      updated: fetchedAt,
      status: "Unable to fetch",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents: [],
      error: error && error.message ? error.message : String(error)
    };

    await writeJsonFileIfChanged(payload);
    console.error("IBM Planning Analytics cache update failed:", payload.error);
    process.exitCode = 0;
  }
}

main();
