# SaaS Status Dashboard

Live dashboard:  
https://mke57.github.io/status-dashboard/

Short links:  
https://bit.ly/ATG-Status  
https://bit.ly/atg-status

QR code:  
A QR code is available for the dashboard and can be used where a scannable link is more convenient than typing the URL.

> Recommended sharing link: `https://bit.ly/ATG-Status`  
> Lowercase alternative: `https://bit.ly/atg-status`

---

## Overview

The SaaS Status Dashboard is a single-page, live operational dashboard for monitoring the public status of key SaaS providers used by ATG.

It aggregates provider status information into one clear, readable dashboard designed for:

- office wallboard displays
- desktop/laptop monitoring
- mobile use
- Home Screen App usage on iPhone/iPad and Android
- quick operational checks by support teams

The dashboard is hosted using GitHub Pages and runs entirely in the browser. It does not require a backend server.

---

## Services monitored

The dashboard currently monitors:

- Cloudflare
- Worldpay
- AudienceView Professional
- AudienceView Unlimited

Each provider entry includes:

- provider status
- active incident count
- active or upcoming maintenance information where available
- provider update time
- recent incident/update details where available
- direct link to the provider’s official status page

---

## Live URLs

Primary GitHub Pages URL:

```text
https://mke57.github.io/status-dashboard/
```

Short links:

```text
https://bit.ly/ATG-Status
https://bit.ly/atg-status
```

The short links are intended for easier sharing and QR code usage.

The short links redirect to the GitHub Pages-hosted version. The GitHub Pages URL remains the actual hosted location.

---

## QR code usage

A QR code is available for quick access to the dashboard.

The QR code can point to either of the bit.ly short links:

```text
https://bit.ly/ATG-Status
```

or:

```text
https://bit.ly/atg-status
```

Using the bit.ly link or a QR code does not affect dashboard functionality.

The dashboard JavaScript runs after the redirect has completed, so features such as:

- install prompt
- localStorage dismissal
- mobile detection
- pull-to-refresh
- status loading
- card expansion/collapse
- theme preference

continue to work normally.

For testing query parameters such as:

```text
?installprompt=true
```

use the direct GitHub Pages URL rather than the bit.ly URL:

```text
https://mke57.github.io/status-dashboard/?installprompt=true
```

---

## Purpose

The dashboard is intended to provide quick visibility of SaaS platform health without requiring users to manually check multiple provider status pages.

It is especially useful for:

- daily operational checks
- support teams needing quick status visibility
- large office display screens
- mobile access by team members
- identifying whether an issue is provider-side before escalating internally

---

## Design goals

The dashboard has been designed around the following principles:

- readable from a distance
- simple at-a-glance status summary
- minimal visual clutter
- clear distinction between incidents and maintenance
- mobile-friendly layout
- fast access on phones via Home Screen installation
- no backend dependency
- easy handover or migration if required

---

## Current key features

### Status summary banner

At the top of the dashboard is a large status banner showing the overall state of monitored services.

Possible banner states include:

- all services operational
- active incident reported
- major incident reported
- maintenance in progress

The banner colour changes depending on the current overall status.

Examples:

- green for all services operational
- yellow for active incidents
- red for major incidents
- blue for maintenance

---

### Summary counters

The dashboard includes high-level summary counters for:

- services monitored
- services with issues
- active incidents

Maintenance is handled separately from incidents where possible, so planned provider maintenance does not incorrectly inflate incident counts.

---

### Provider cards

Each monitored provider appears as a card.

Each card includes:

- provider name
- provider logo
- current status badge
- active incident count
- maintenance summary where relevant
- provider last updated time
- expandable details section

Provider cards use colour-coded left borders:

- green for operational
- yellow for incident/warning
- red for major incident/fetch failure
- blue for maintenance

---

### Expandable details

Provider cards include additional details which can be expanded or collapsed.

Expanded details may show:

- active incident details
- maintenance in progress
- upcoming maintenance within 24 hours
- the last three resolved incidents
- latest provider update
- incident history notes

On mobile, cards are designed to remain compact by default.

Users can expand cards to reveal more detail when needed.

---

### Mobile card expansion

On mobile devices, each card includes a small expand/collapse arrow.

Tapping the arrow expands the card to show additional detail.

Tapping again collapses the card.

This keeps the mobile view clean while still allowing access to:

- recent resolved incidents
- active incident detail
- upcoming maintenance
- maintenance in progress
- provider update history

---

### Desktop card expansion

On desktop and laptop screens, cards can be expanded by double-clicking the card.

This allows more incident and maintenance detail to be reviewed without permanently increasing the default wallboard card size.

Auto-refresh is paused while any card is expanded so that the user does not lose the detail view mid-read.

When all cards are collapsed again, auto-refresh resumes.

---

### Auto-refresh

The dashboard automatically refreshes provider data every 60 seconds.

A countdown is shown in the footer.

When the dashboard refreshes, the UI dims briefly to indicate that fresh data is being loaded.

The footer shows:

- last refreshed time
- next refresh countdown
- dashboard version
- maintainer information

---

### Pull-to-refresh on mobile

Mobile users can manually refresh the dashboard using a pull-to-refresh gesture.

The gesture includes visual states:

- Pull to refresh
- Release to refresh
- Refreshing...

The gesture has been tuned so that:

- the user must pull far enough before refresh is triggered
- sliding back upwards before release cancels the refresh
- the page should not scroll underneath the gesture once pull-to-refresh has been captured
- refresh only occurs when released while still beyond the threshold

This is intended to feel closer to native mobile app behaviour.

---

### Cache-busting refresh

Manual pull-to-refresh reloads the page with a cache-busting query parameter.

This helps force the browser/Home Screen App to retrieve the latest HTML rather than relying on a cached version.

---

### Mobile/Home Screen App install prompt

On first visit from a mobile device, the dashboard displays a one-time install prompt.

The prompt appears as a centred modal-style card over a dimmed background.

It is designed to guide users to add the dashboard to their Home Screen.

The prompt:

- only appears on mobile devices
- does not appear when already running as an installed Home Screen app
- can be dismissed
- stores dismissal in localStorage
- does not repeatedly nag the user
- can be forced for testing using a query parameter

For iPhone/iPad users, the prompt provides instructions to:

1. tap the Share button in Safari
2. scroll down the share sheet
3. tap Add to Home Screen
4. tap Add to confirm

For Android users, the prompt provides browser menu / install app guidance.

---

### Install prompt test mode

Because the install prompt is designed to show only once, a test override is available.

To force the prompt to show, add this to the URL:

```text
?installprompt=true
```

Example:

```text
https://mke57.github.io/status-dashboard/?installprompt=true
```

This does not require any additional folder, file, GitHub route, or repository setup.

It is purely handled by JavaScript reading the query string.

To manually reset the dismissed state in the browser console:

```javascript
localStorage.removeItem("statusDashboardInstallPromptDismissed");
```

Private/incognito browsing may also show the prompt again because localStorage is temporary in that browsing session.

---

### Installed app detection

The dashboard attempts to detect whether it is already running as a Home Screen App / standalone app.

If the page is running in standalone mode, the install prompt is suppressed.

This helps avoid telling users to install something they are already using as an installed app.

---

### Mobile PWA-style behaviour

The dashboard includes mobile web app meta tags for iOS, including:

- Apple mobile web app capability
- app title
- status bar styling
- touch icon

This helps the dashboard behave more like an app when added to the Home Screen.

---

### Orientation handling

The dashboard includes orientation/refit handling.

When a mobile device is rotated, the layout is recalculated after orientation change to help prevent sizing and fit issues.

---

### Hidden light/dark wallboard theme toggle

The dashboard includes a hidden light/dark theme toggle.

To toggle between dark and light wallboard themes:

```text
Tap/click the ATG logo four times quickly
```

The selected theme is stored locally in the browser using localStorage.

This is intended as a hidden utility feature rather than a visible user control.

---

### Easter egg status messages

When all services are operational, the summary banner supports hidden positive/easter egg messages.

The banner can be triggered by interaction when the dashboard is in an all-operational state.

These messages are purely cosmetic and do not affect status reporting.

---

## Status logic

The dashboard attempts to normalise status reporting across providers.

Providers do not all use their public status APIs in the same way, so the dashboard includes additional logic to interpret:

- active incidents
- major incidents
- scheduled maintenance
- active maintenance
- upcoming maintenance
- incident-style maintenance notices

---

## Incident handling

Normal incidents are treated as incidents unless they are detected as maintenance notices.

The dashboard checks provider incident data and separates:

- genuine incidents
- scheduled maintenance notices
- maintenance-style provider updates

This helps avoid planned maintenance being counted as an active incident.

---

## Major incident handling

Incidents may be treated as major if their name, status, or impact suggests a major/critical issue.

Major incidents affect the overall banner and card severity more strongly than minor incidents.

---

## Maintenance handling

The dashboard supports multiple forms of maintenance detection.

### Native scheduled maintenance

Where providers expose proper scheduled maintenance objects through their API, the dashboard uses those objects directly.

This includes:

- upcoming scheduled maintenance
- active maintenance
- in-progress maintenance
- verifying maintenance

### Inferred maintenance windows

Some providers publish maintenance as an incident-style notice rather than a structured maintenance object.

For these cases, the dashboard can infer a maintenance window from the provider notice text.

For example, if a provider notice says:

```text
We’ll be performing vital system maintenance on Monday, June 15 at 3:00 AM EST.
We expect approximately 30 minutes of downtime.
```

The dashboard attempts to parse:

- the maintenance start time
- the expected duration

It then treats the maintenance as active only during the inferred window.

This prevents the dashboard from dropping back to operational immediately after the scheduled start time if the provider has not explicitly marked the maintenance as in progress.

The inferred maintenance logic is only applied to items already classified as maintenance notices. It is not applied to normal incidents.

This helps preserve accurate incident reporting.

---

## Provider status links

Each provider card links to the provider’s official status page.

Users should open the provider’s own status page directly if:

- a service shows Unable to fetch
- there is uncertainty about provider-reported status
- more detailed provider information is required

---

## Error handling

If a provider API cannot be reached, the dashboard shows:

```text
Unable to fetch
```

This may happen because:

- the provider API is temporarily unavailable
- the local network blocks the request
- the provider changes their API
- CORS/browser restrictions prevent the fetch
- the user has no network connectivity

When this happens, users should check the provider’s official status page directly.

---

## Browser and device support

The dashboard is designed to work in modern browsers.

Recommended browsers:

- Microsoft Edge
- Google Chrome
- Safari on iOS/iPadOS
- Safari on macOS

The dashboard is designed for:

- desktop monitors
- wallboard displays
- iPhone/iPad
- Android phones

---

## Wallboard usage

For wallboard use:

1. Open the dashboard URL in a browser.
2. Fullscreen the browser.
3. Leave the dashboard running.

Recommended URL:

```text
https://mke57.github.io/status-dashboard/
```

or:

```text
https://bit.ly/ATG-Status
https://bit.ly/atg-status
```

The dashboard automatically refreshes every 60 seconds and is designed to remain readable from a distance.

---

## Mobile usage

For mobile use:

1. Open the dashboard link in a mobile browser.
2. Follow the first-visit prompt to add it to the Home Screen.
3. Launch the dashboard from the Home Screen icon for best experience.

Mobile users can:

- view current service status
- expand provider cards for more detail
- pull down to refresh
- use the dashboard in a full-screen app-like mode once installed

---

## Teams usage

The dashboard can be shared in Teams using either:

```text
https://bit.ly/ATG-Status
https://bit.ly/atg-status
```

or:

```text
https://mke57.github.io/status-dashboard/
```

It can also be added as a Teams tab if required.

Note that Teams embedded browser behaviour may differ from a normal browser, especially around mobile install prompts and localStorage.

For best mobile app installation behaviour, users should open the link in Safari or their default mobile browser.

---

## Testing

### Test the live dashboard

Open:

```text
https://mke57.github.io/status-dashboard/
```

### Test the short links

Open:

```text
https://bit.ly/ATG-Status
https://bit.ly/atg-status
```

Both should redirect to the live dashboard.

### Test the install prompt

Open:

```text
https://mke57.github.io/status-dashboard/?installprompt=true
```

### Reset install prompt dismissal

Run in browser console:

```javascript
localStorage.removeItem("statusDashboardInstallPromptDismissed");
```

### Test mobile installed mode

On iPhone/iPad:

1. Open the dashboard in Safari.
2. Add to Home Screen.
3. Launch from the Home Screen icon.
4. Confirm the install prompt no longer appears.

### Test pull-to-refresh

On mobile:

1. Scroll to the top of the dashboard.
2. Pull down.
3. Confirm the pill shows Pull to refresh.
4. Pull further.
5. Confirm the pill changes to Release to refresh.
6. Slide back up before release.
7. Confirm the prompt cancels and no refresh occurs.
8. Pull down again and release past threshold.
9. Confirm the dashboard refreshes.

### Test card expansion

On mobile:

1. Tap the arrow on a provider card.
2. Confirm details expand.
3. Tap again.
4. Confirm details collapse.

On desktop:

1. Double-click a provider card.
2. Confirm the card expands.
3. Double-click again.
4. Confirm the card collapses.

### Test hidden theme toggle

Tap/click the ATG logo four times quickly.

Confirm the dashboard toggles between dark and light wallboard theme.

---

## Updating the dashboard

The dashboard is a static HTML file.

To update the live dashboard:

1. Open the repository in GitHub.
2. Open `index.html`.
3. Click the edit pencil icon.
4. Make the required changes.
5. Commit changes to the relevant branch.
6. Wait for GitHub Pages to publish the update.

The live dashboard usually updates within approximately one minute.

If the change does not appear immediately, refresh the browser or use a cache-busting URL.

---

## Deployment

The dashboard is currently deployed using GitHub Pages.

The public URL is:

```text
https://mke57.github.io/status-dashboard/
```

The dashboard does not require:

- Node.js
- a backend server
- a build step
- a database
- authentication
- server-side configuration

It is a standalone static HTML/JavaScript/CSS dashboard.

---

## File structure

The main dashboard is expected to be served as:

```text
index.html
```

Additional asset references may include:

- provider logos
- ATG logo
- touch icon
- favicon
- QR code image, if stored in the repository

Provider logo URLs are referenced directly in the dashboard configuration.

---

## Adding the QR code to the repository

If the QR code image is added to the repository, a suggested location is:

```text
assets/qr/atg-status-qr.png
```

The README can then include it using:

```markdown
![ATG Status Dashboard QR Code](assets/qr/atg-status-qr.png)
```

If the QR code is not stored in the repository, this README can simply describe that a QR code exists and is available for use in rollout material.

---

## Adding another provider

To add a new provider, identify whether the provider has a public status API.

Many status pages powered by Atlassian Statuspage expose URLs such as:

```text
https://status.example.com/api/v2/summary.json
```

and:

```text
https://status.example.com/api/v2/incidents.json
```

Add a new object to the `providers` array.

Example:

```javascript
{
  name: "Provider Name",
  url: "https://status.example.com/api/v2/summary.json",
  incidentsUrl: "https://status.example.com/api/v2/incidents.json",
  statusPage: "https://status.example.com/",
  logoText: "PN",
  logoSrc: "https://example.com/logo.png"
}
```

The fields are:

- `name` — display name shown on the dashboard
- `url` — provider summary API
- `incidentsUrl` — provider incidents API
- `statusPage` — provider’s human-readable status page
- `logoText` — fallback text if the logo fails to load
- `logoSrc` — logo image URL

After adding a provider, test:

- successful data loading
- logo rendering
- incident handling
- maintenance handling
- mobile layout
- wallboard layout

---

## Removing a provider

To remove a provider:

1. Open the `providers` array.
2. Remove the relevant provider object.
3. Commit the change.
4. Confirm the dashboard still lays out correctly on desktop and mobile.

---

## Changing refresh interval

The dashboard refresh interval is controlled by:

```javascript
const refreshIntervalMs = 60000;
```

The value is in milliseconds.

For example:

```javascript
60000
```

means 60 seconds.

Any change should be tested carefully to avoid excessive requests to provider APIs.

---

## Local storage usage

The dashboard uses localStorage for a small number of user/device-specific preferences.

Stored values may include:

- dismissed install prompt state
- selected hidden theme
- easter egg message index

These values are stored only in the user’s browser.

Private/incognito sessions may clear these values when the session ends.

---

## Query parameters

The dashboard supports query parameters for testing and cache-busting.

### Install prompt test

```text
?installprompt=true
```

Forces the mobile install prompt to appear, provided the page is not running as an installed Home Screen app.

### Reload cache-bust

Pull-to-refresh may add a reload query parameter such as:

```text
?reload=...
```

This helps force the latest HTML to load.

---

## Known limitations

### Provider API differences

Not all providers expose data in the same way.

Some providers may:

- use proper scheduled maintenance objects
- publish maintenance as incident-style notices
- omit in-progress maintenance state
- update status pages manually
- delay API updates
- change their API structure

The dashboard attempts to normalise these differences but cannot guarantee perfect interpretation of all provider data.

### Public API dependency

The dashboard depends on publicly accessible provider APIs.

If a provider API changes, becomes unavailable, or blocks requests, the dashboard may show Unable to fetch.

### Browser caching

Mobile browsers and Home Screen Apps may cache aggressively.

The dashboard includes cache-busting behaviour for manual pull-to-refresh, but browser caching can still occasionally affect update behaviour.

### Short links

The bit.ly links are convenience redirects.

The GitHub Pages URL remains the canonical hosted location.

### Query parameters through bit.ly

Testing query parameters such as:

```text
?installprompt=true
```

should be used with the direct GitHub Pages URL, not the bit.ly URL.

---

## Troubleshooting

### Service shows "Unable to fetch"

Try:

1. Open the provider’s official status page directly.
2. Refresh the dashboard.
3. Try a different network.
4. Check browser console for fetch/CORS/network errors.
5. Confirm the provider API URL still works.

### Dashboard does not update after a code change

Try:

1. Wait a minute for GitHub Pages to publish.
2. Hard refresh the browser.
3. Add a temporary query parameter to the URL.
4. Use pull-to-refresh on mobile.
5. Confirm the correct file was committed as `index.html`.

### Install prompt does not show

Check:

1. Is the device mobile?
2. Is the dashboard already running as a Home Screen App?
3. Has the prompt already been dismissed?
4. Is localStorage available?
5. Try direct test URL:

```text
https://mke57.github.io/status-dashboard/?installprompt=true
```

### Install prompt keeps appearing

Check whether the browser is in private/incognito mode.

Private browsing may clear localStorage after the session ends.

### Pull-to-refresh does not trigger

Check:

1. Page is scrolled to the top.
2. Gesture is started from the top of the page.
3. Pull distance is sufficient.
4. Card details are not expanded.
5. Browser/home screen app supports touch events as expected.

### Card details are not visible

On mobile, use the collapse/expand arrow on each card.

On desktop, double-click the card.

### Auto-refresh appears paused

Auto-refresh pauses while one or more cards are expanded.

Collapse expanded cards to resume normal auto-refresh behaviour.

---

## Versioning

The dashboard version is shown in the footer.

Example:

```text
Version: v0.5.51 | Built and maintained by Mike Ahrens
```

Each update should increment the version number in the HTML file.

Recommended versioning style:

```text
v0.5.51
v0.5.52
v0.5.53
```

Commit messages should clearly describe the change.

Example:

```text
Add first-visit mobile install prompt with test override
```

---

## Current notable version history

### v0.5.44

Maintenance summary fix.

### v0.5.45

Blue maintenance banner.

### v0.5.46

Hidden theme toggle, desktop details and pull-to-refresh support.

### v0.5.47

Pull-to-refresh cancellation behaviour fixed.

### v0.5.48

Pull-to-refresh gesture capture improved.

### v0.5.49

Pull-to-refresh scroll lock improved.

### v0.5.50

Inferred active maintenance windows added.

### v0.5.51

First-visit mobile install prompt added with `?installprompt=true` test override.

---

## Security and privacy

The dashboard:

- does not require login
- does not collect user credentials
- does not send data to a backend service
- does not store personal data
- only reads public provider status APIs
- uses localStorage for local UI preferences only

Because the repository is public, do not add:

- passwords
- API keys
- internal URLs that should not be public
- confidential notes
- private operational information

---

## Repository visibility

This repository is public.

Before adding content, assume that anything committed may be visible externally.

---

## Ownership

This dashboard was built and is maintained by Mike Ahrens.

Current hosting is via GitHub Pages as a lightweight and temporary hosting solution.

The dashboard can be migrated later to:

- an ATG-owned GitHub repository
- an internal static web server
- an official company domain
- another static hosting platform

The dashboard is intentionally static and portable to make future handover easier.

---

## Continuity recommendation

At least one additional team member should have:

- access to the repository
- knowledge of how to edit `index.html`
- awareness of how GitHub Pages deployment works
- awareness of where the live dashboard URL is shared

This helps avoid a single point of failure if updates are required when the original maintainer is unavailable.

---

## Recommended rollout message

Suggested wording when sharing the dashboard internally:

```text
The SaaS Status Dashboard is available here:

https://bit.ly/ATG-Status

Lowercase alternative:

https://bit.ly/atg-status

For best use on mobile, open the link in Safari/your mobile browser and add it to your Home Screen when prompted. This gives quick access and makes the dashboard behave more like an app.

The dashboard refreshes automatically every 60 seconds and can also be manually refreshed on mobile using pull-to-refresh.
```

---

## Do not download the HTML file for normal use

Users should always use the live dashboard link.

Do not download and open the HTML file locally unless specifically testing or developing changes.

The live hosted version ensures users see the current published dashboard.

---

## Support notes

If the dashboard reports a SaaS issue:

1. Open the relevant provider status page from the card.
2. Confirm the provider-reported status.
3. Check whether the issue is an incident, maintenance, or API fetch issue.
4. Communicate internally as appropriate.

The dashboard is a visibility tool and should be used alongside normal incident/support processes.
