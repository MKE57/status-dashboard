# SaaS Status Dashboard

Live dashboard:
https://mke57.github.io/status-dashboard/

---

## What this is

This is a simple dashboard that shows the live status of:

- Cloudflare
- Worldpay
- AudienceView Professional
- AudienceView Unlimited

It refreshes automatically every 60 seconds.

---

## How to use it

Open this link in your browser:

https://mke57.github.io/status-dashboard/

You can also add it as a tab in Teams.

Do not download the HTML file unless needed, always use the live link.

---

## How to update it

1. Open this repository in GitHub
2. Click on `index.html`
3. Click the edit (pencil) icon
4. Make your changes
5. Click "Commit changes"

The dashboard will update automatically within about 1 minute.

---

## How to add another service

Find a status API (usually ends in `/api/v2/summary.json`) and add it to the providers list in `index.html`.

---

## Notes

- This dashboard depends on public status APIs
- Some environments may block access
- If a service shows "Unable to fetch", open the provider's status page directly

---

## Ownership

This repository is public.

At least one additional team member should have access to edit it to ensure continuity.
