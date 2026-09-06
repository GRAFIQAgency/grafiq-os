# GRAFIQ Clipper (browser extension)

Save the freelancer profile you are looking at into GRAFIQ OS → Sourcing with
one click. It reads only what is visible to you on the current page, one
profile at a time, and sends it to your GRAFIQ OS using your existing login.

Supported readers: generic (any page with schema.org / Open Graph data),
Upwork, Fiverr, Navolnenoze.cz, Freelance.cz. Everything else falls back to the
generic reader and you can edit the fields before saving.

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → choose this `extension/` folder.
3. Click the extension icon → **Open options** → enter your GRAFIQ OS address
   (e.g. `https://grafiq-os.vercel.app` or `http://localhost:3000`), allow the
   permission prompt, save.
4. Sign in to GRAFIQ OS in the same browser.
5. Open a profile page, click the icon, check the fields, **Save to GRAFIQ OS**.

The clip goes through the normal pipeline (deduplication, scoring) with source
`clipper` and the page URL as source URL. Run migration `0006_sourcing_clipper.sql`
once so the connector is registered.

## Compliance

Use it as a person: save profiles you have opened yourself, respect each
platform's terms, and do not automate it. LinkedIn's terms are strict enough
that we do not recommend clipping there.

## Updating readers

Platform readers live in `extract.js`. They are best-effort selector maps and
can break when a site changes its markup; the generic reader keeps working.
