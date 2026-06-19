const fs = require("node:fs/promises");
const path = require("node:path");

const URL = "https://status.ai-apps-comms.ibm.com/announcement/iotm/api/v1/ext/jn%2FSZCAhTWOYC9D3DEuLiA%3D%3D/notices.json";
const OUTPUT = path.join("data", "ibm-controller.json");

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  try {
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const notices = data?.notices || [];

    const recentIncidents = notices.slice(0, 10).map(n => ({
      name: n.title || "IBM Controller Notice",
      body: n.summary || n.title || "",
      status: "resolved",
      impact: "minor",
      created_at: n.publishedAt || nowIso(),
      updated_at: n.publishedAt || nowIso(),
      resolved_at: n.publishedAt || nowIso(),
      incident_updates: [{ body: n.summary || n.title || "" }]
    }));

    const payload = {
      provider: "IBM Controller",
      cacheStatus: "ok",
      fetchedAt: nowIso(),
      status: "Operational",
      activeIncidents: [],
      activeMaintenances: [],
      upcomingMaintenances: [],
      recentIncidents,
      noticeCount: recentIncidents.length
    };

    await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2));
    console.log("IBM Controller updated");

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
