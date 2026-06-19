const fs = require("node:fs/promises");
const path = require("node:path");

const IBM_URL = "https://status.ai-apps-comms.ibm.com/announcement/iotm/api/v1/ext/jn%2FSZCAhTWOYC9D3DEuLiA%3D%3D/notices.json";
const OUTPUT = path.join("data", "ibm-controller.json");

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

function normaliseNotice(notice) {
  const title = firstPath(notice, [
    "title", "name", "summary", "subject", "notificationTitle", "headline", "eventTitle", "shortDescription", "attributes.title"
  ]) || "IBM notice";

  const body = stripHtml(firstPath(notice, [
    "description", "body", "message", "notificationContent", "content", "details", "longDescription", "attributes.description", "attributes.body"
  ]) || "");

  const status = firstPath(notice, ["status", "state", "category", "notificationStatus", "eventStatus", "attributes.status"]) || "";
  const impact = firstPath(notice, ["impact", "severity", "priority", "eventType", "type", "attributes.severity"]) || "";

  const createdAt = firstPath(notice, ["created_at", "createdAt", "creationDate", "createdDate", "startDate", "date"]);
  const updatedAt = firstPath(notice, ["updated_at", "updatedAt", "lastUpdated", "modifiedDate"]) || createdAt;

  return {
    name: stripHtml(title),
    body,
    status: String(status),
    impact: String(impact),
    created_at: createdAt,
    updated_at: updatedAt,
    incident_updates: body ? [{ body }] : []
  };
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

  return [];
}

function isMaintenanceNotice(item) {
  const text = (item.name || "") + " " + (item.body || "");
  return text.toLowerCase().includes("maintenance");
}

function isResolved(item) {
  const status = (item.status || "").toLowerCase();
  const body = (item.body || "").toLowerCase();
  return status.includes("resolved") || body.includes("resolved");
}

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
}

async function main() {
  try {
    const res = await fetch(IBM_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const notices = getNoticeArray(data).map(normaliseNotice);

    const recentIncidents = sortNewestFirst(
      notices.filter(n => !isMaintenanceNotice(n))
    ).slice(0, 10);

    const payload = {
      provider: "IBM Controller",
      cacheStatus: "ok",
      fetchedAt: nowIso(),
      status: "Operational",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents,
      noticeCount: notices.length
    };

    await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2));

    console.log("IBM Controller updated", payload.noticeCount);
  } catch (err) {
    const payload = {
      provider: "IBM Controller",
      cacheStatus: "error",
      fetchedAt: nowIso(),
      status: "Unable to fetch",
      activeIncidents: [],
      recentIncidents: [],
      error: err.message
    };

    await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2));
  }
}

main();
