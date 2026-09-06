/**
 * Page reader injected into the active tab by the popup. Returns a plain
 * object describing the profile that is visible on the page. Platform readers
 * are best-effort selector maps layered on top of a generic reader; every
 * field can be edited in the popup before saving.
 */
(() => {
  const txt = (sel, root = document) => root.querySelector(sel)?.textContent?.trim() || "";
  const attr = (sel, name, root = document) => root.querySelector(sel)?.getAttribute(name) || "";
  const meta = (name) => attr(`meta[property="${name}"]`, "content") || attr(`meta[name="${name}"]`, "content");
  const uniq = (list) => [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const firstLink = (patterns) => {
    for (const a of document.querySelectorAll("a[href^='http']")) {
      const href = a.href;
      if (href.includes(location.hostname)) continue;
      if (patterns.some((p) => p.test(href))) return href;
    }
    return "";
  };
  const rateFrom = (text) => {
    const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*(?:(USD|EUR|CZK|Kč|\$|€)|(?=\s*\/\s*h))/i) || String(text).match(/(\$|€)\s*(\d+(?:[.,]\d+)?)/);
    if (!m) return {};
    const nums = m.slice(1).filter((x) => x && /\d/.test(x));
    const cur = m.slice(1).find((x) => x && !/\d/.test(x)) || "";
    const currency = /\$|USD/i.test(cur) ? "USD" : /€|EUR/i.test(cur) ? "EUR" : /Kč|CZK/i.test(cur) ? "CZK" : "";
    return { hourlyRateMin: nums[0] ? Number(nums[0].replace(",", ".")) : undefined, rateCurrency: currency || undefined };
  };
  const splitLocation = (loc) => {
    const parts = clean(loc).split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
    return parts[0] ? { city: parts[0] } : {};
  };

  // ---- Generic: schema.org Person, Open Graph, headings ----
  function generic() {
    const out = { platform: "web", sourceUrl: location.href, profileUrl: location.href };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const json = JSON.parse(script.textContent || "null");
        const nodes = Array.isArray(json) ? json : json?.["@graph"] ? json["@graph"] : [json];
        const person = nodes.find((n) => n && (n["@type"] === "Person" || (Array.isArray(n["@type"]) && n["@type"].includes("Person"))));
        if (person) {
          out.fullName = clean(person.name);
          out.headline = clean(person.jobTitle || person.description).slice(0, 140);
          out.email = clean(person.email).replace(/^mailto:/, "");
          out.portfolioUrl = typeof person.url === "string" ? person.url : "";
          if (person.address) Object.assign(out, splitLocation([person.address.addressLocality, person.address.addressCountry].filter(Boolean).join(", ")));
          if (Array.isArray(person.knowsAbout)) out.skills = uniq(person.knowsAbout.map((k) => (typeof k === "string" ? k : k?.name)));
          break;
        }
      } catch {}
    }
    out.fullName = out.fullName || clean(meta("profile:first_name") + " " + meta("profile:last_name")) || clean(txt("h1")) || clean(meta("og:title")).split(/[|–—-]/)[0].trim();
    out.headline = out.headline || clean(meta("og:description") || meta("description")).slice(0, 140);
    out.summary = clean(meta("description") || meta("og:description")).slice(0, 1000);
    out.portfolioUrl = out.portfolioUrl || firstLink([/behance|dribbble|\.dev\b|portfolio|\.design\b|webflow\.io|framer\.website/i]);
    return out;
  }

  // ---- Upwork freelancer profile (logged-in SPA; selectors are best effort) ----
  function upwork(base) {
    const name = clean(txt("[data-test='profile-name']") || txt("h2[itemprop='name']") || txt(".identity-content h2, .profile-name h2, h1"));
    const title = clean(txt("[data-test='profile-title']") || txt(".up-card-section h2, [itemprop='jobTitle']"));
    const loc = clean(txt("[data-test='location']") || txt(".location, [itemprop='address']"));
    const rate = txt("[data-test='rate']") || txt("[data-qa='rate']") || (document.body.innerText.match(/\$\s?\d+(?:\.\d+)?\s*\/\s*hr/) || [""])[0];
    const skills = uniq([...document.querySelectorAll("[data-test='skill'] , .skills-list span, a[href*='/skills/'] , span.air3-token")].map((e) => e.textContent));
    const overview = clean(txt("[data-test='profile-overview']") || txt(".profile-overview, [data-qa='overview']"));
    return { ...base, platform: "upwork", fullName: name || base.fullName, headline: title || base.headline, role: title, ...splitLocation(loc), ...rateFrom(rate), skills: skills.length ? skills.slice(0, 20) : base.skills, summary: overview || base.summary, employmentType: "freelancer" };
  }

  // ---- Fiverr seller page ----
  function fiverr(base) {
    const name = clean(txt(".seller-card .seller-link, [class*='seller-name'], .profile-header h1, h1"));
    const title = clean(txt(".seller-card .one-liner, [class*='one-liner'], .profile-header p"));
    const loc = clean(txt(".seller-card .location, [class*='location'] span, [data-testid='location']"));
    const skills = uniq([...document.querySelectorAll(".skills li, [class*='skills'] a, [class*='skill-tag']")].map((e) => e.textContent));
    const desc = clean(txt(".description, [class*='description'] p, [data-testid='description']"));
    return { ...base, platform: "fiverr", fullName: name || base.fullName, headline: title || base.headline, role: title, ...(loc ? { country: loc } : {}), skills: skills.length ? skills.slice(0, 20) : base.skills, summary: desc || base.summary, employmentType: "freelancer" };
  }

  // ---- Navolnenoze.cz (Czech freelancer directory) ----
  function navolnenoze(base) {
    const name = clean(txt("h1.n1") || txt("h1"));
    const headline = clean(txt("h2.pr"));
    const body = document.body.innerText;
    const region = (body.match(/Působnost:\s*([^\n•]+)/) || [])[1];
    const status = (body.match(/Status:\s*([^\n•]+)/) || [])[1];
    const categories = (body.match(/Kategorie:\s*([^\n]+)/) || [])[1];
    const skills = categories ? uniq(categories.split(/\s{2,}|\s(?=[A-ZÁ-Ž])/)).filter((s) => s.length > 1) : [];
    const availability = /k vašim službám|volné kapacity/i.test(status || "") ? "available" : /vytížen|omez/i.test(status || "") ? "limited" : /nepřijím|obsazen/i.test(status || "") ? "unavailable" : undefined;
    const rate = (body.match(/(\d[\d\s]*)\s*Kč\s*\/\s*(hod|h)/i) || [])[1];
    const web = firstLink([/./]);
    const intro = clean((body.split(/Kategorie:[^\n]*\n/)[1] || "").split(/\nPORTFOLIO/i)[0]).slice(0, 1000);
    return {
      ...base, platform: "navolnenoze", fullName: name || base.fullName, headline: headline || base.headline, role: headline,
      country: "Czech Republic", city: region && !/celá ČR|celá republika|kdekoli/i.test(region) ? clean(region) : undefined,
      remote: /celá ČR|kdekoli|online/i.test(region || "") ? true : undefined, availability, skills: skills.length ? skills : base.skills,
      hourlyRateMin: rate ? Number(rate.replace(/\s/g, "")) : undefined, rateCurrency: rate ? "CZK" : undefined,
      portfolioUrl: web || base.portfolioUrl, summary: intro || base.summary, employmentType: "freelancer", languages: ["Czech"],
    };
  }

  // ---- Freelance.cz (name and rate are members-only; headline, skills, location and languages are public) ----
  function freelanceCz(base) {
    const body = document.body.innerText;
    const after = (label) => clean((body.match(new RegExp(label + "\\s*:?\\s*([^\\n]+)")) || [])[1] || "");
    const headline = clean(txt("h1"));
    const loc = after("Lokalita");
    const years = (after("Celkové pracovní zkušenosti").match(/\d+/) || [])[0];
    const langs = after("Jazykové znalosti").split(/,\s*/).map((l) => l.replace(/Čeština/i, "Czech").replace(/Angličtina/i, "English").replace(/Němčina/i, "German").replace(/Španělština/i, "Spanish")).filter(Boolean);
    const status = after("Současný profesní stav");
    const rateText = after("Hodinová sazba");
    const skillsHeading = [...document.querySelectorAll("h3")].find((h) => /Hlavní dovednosti/i.test(h.textContent || ""));
    // Skills are rendered as "Email marketing 2" (name + level); keep the name only.
    const skills = skillsHeading
      ? uniq([...skillsHeading.parentElement.querySelectorAll("li, .badge, span")].map((e) => clean(e.textContent).replace(/\s+\d+$/, "")))
          .filter((s) => s.length > 1 && s.length < 40 && !/^\d+$/.test(s)).slice(0, 20)
      : [];
    const rate = rateText.match(/(\d[\d\s]*)/);
    const [city, countryCode] = loc.split(",").map((x) => x.trim());
    return {
      ...base, platform: "freelance.cz", fullName: "", headline: headline || base.headline, role: headline.slice(0, 100),
      city: city || undefined, country: /^CZ$/i.test(countryCode || "") || !countryCode ? "Czech Republic" : countryCode,
      yearsExperience: years ? Number(years) : undefined, languages: langs.length ? langs : ["Czech"], skills: skills.length ? skills : base.skills,
      employmentType: /freelancer|OSVČ/i.test(status) ? "freelancer" : undefined,
      hourlyRateMin: rate ? Number(rate[1].replace(/\s/g, "")) : undefined, rateCurrency: rate ? "CZK" : undefined, summary: "",
    };
  }

  // ---- Other Czech boards: generic + Czech defaults ----
  function czechGeneric(base, platform) {
    const body = document.body.innerText;
    const rate = (body.match(/(\d[\d\s]*)\s*Kč\s*\/\s*(hod|h)/i) || [])[1];
    return { ...base, platform, country: base.country || "Czech Republic", hourlyRateMin: rate ? Number(rate.replace(/\s/g, "")) : base.hourlyRateMin, rateCurrency: rate ? "CZK" : base.rateCurrency, languages: ["Czech"] };
  }

  const host = location.hostname.replace(/^www\./, "");
  const base = generic();
  let data = base;
  if (host.endsWith("upwork.com")) data = upwork(base);
  else if (host.endsWith("fiverr.com")) data = fiverr(base);
  else if (host.endsWith("navolnenoze.cz")) data = navolnenoze(base);
  else if (host.endsWith("freelance.cz")) data = freelanceCz(base);
  else if (host.endsWith("webtrh.cz")) data = czechGeneric(base, "webtrh");
  else if (host.endsWith("github.com")) data = { ...base, platform: "github", role: base.role || "Developer" };
  else if (host.endsWith("behance.net")) data = { ...base, platform: "behance", role: base.role || "Designer" };
  else if (host.endsWith("dribbble.com")) data = { ...base, platform: "dribbble", role: base.role || "Designer" };

  // Never send more than we intend to.
  const allowed = ["platform", "sourceUrl", "profileUrl", "fullName", "headline", "role", "email", "portfolioUrl", "country", "city", "remote", "availability", "skills", "hourlyRateMin", "rateCurrency", "summary", "employmentType", "languages", "yearsExperience"];
  return Object.fromEntries(Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));
})();
