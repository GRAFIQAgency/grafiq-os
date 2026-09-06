/* global clipperSettings */
(async () => {
  const { appUrl, t } = await clipperSettings();
  const main = document.getElementById("main");
  const notice = document.getElementById("notice");
  const status = document.getElementById("status");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  if (!appUrl) {
    notice.innerHTML = `${esc(t.notConfigured)}<br/><br/><button id="opt" class="ghost">${esc(t.openOptions)}</button>`;
    document.getElementById("opt").onclick = () => chrome.runtime.openOptionsPage();
    return;
  }

  // 1. Is the user signed in to GRAFIQ OS?
  let me = null;
  try {
    const res = await fetch(`${appUrl}/api/sourcing/clip`, { credentials: "include", headers: { "X-GRAFIQ-Clipper": "1" } });
    if (res.ok) me = await res.json();
  } catch {}
  if (!me?.authenticated) {
    notice.innerHTML = `${esc(t.notLoggedIn)}<br/><br/><a href="${esc(appUrl)}/login" target="_blank">${esc(t.signIn)}</a>`;
    return;
  }
  status.textContent = me.name || "";

  // 2. Read the current page.
  notice.textContent = t.reading;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let data = {};
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["extract.js"] });
    data = result?.result ?? {};
  } catch {
    data = { platform: "unknown", sourceUrl: tab.url };
  }
  const empty = !data.fullName;

  // 3. Render the form.
  const field = (name, label, value = "", tag = "input", full = false) =>
    `<div class="${full ? "full" : ""}"><label for="${name}">${esc(label)}</label>${
      tag === "textarea" ? `<textarea id="${name}" name="${name}">${esc(value)}</textarea>` : `<input id="${name}" name="${name}" value="${esc(value)}" />`
    }</div>`;
  const currency = data.rateCurrency || "";
  main.innerHTML = `
    <div class="platform"><span>${esc(t.platform)}: <b>${esc(data.platform || "web")}</b></span><span>${esc(new URL(tab.url).hostname)}</span></div>
    ${empty ? `<div class="notice" style="margin-bottom:10px">${esc(t.nothing)}</div>` : ""}
    <form id="clip" class="grid">
      ${field("fullName", t.fullName, data.fullName)}
      ${field("role", t.role, data.role)}
      ${field("headline", t.headline, data.headline, "input", true)}
      ${field("email", t.email, data.email)}
      ${field("portfolioUrl", t.portfolioUrl, data.portfolioUrl)}
      ${field("country", t.country, data.country)}
      ${field("city", t.city, data.city)}
      ${field("hourlyRateMin", t.rate, data.hourlyRateMin ?? "")}
      <div><label for="rateCurrency">${esc(t.currency)}</label><select id="rateCurrency" name="rateCurrency">
        <option value="">—</option>${["CZK", "EUR", "USD"].map((c) => `<option ${c === currency ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      ${field("skills", t.skills, (data.skills || []).join(", "), "input", true)}
      ${field("summary", t.summary, data.summary, "textarea", true)}
      ${field("sourceUrl", t.sourceUrl, data.sourceUrl || tab.url, "input", true)}
      <input type="hidden" name="profileUrl" value="${esc(data.profileUrl || tab.url)}" />
      <input type="hidden" name="platform" value="${esc(data.platform || "")}" />
      <div class="full row"><button type="submit" id="save">${esc(t.save)}</button><span id="msg" class="msg"></span></div>
      <div class="full msg">${esc(t.compliance)}</div>
    </form>`;

  // 4. Save.
  document.getElementById("clip").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("save");
    const msg = document.getElementById("msg");
    btn.disabled = true;
    btn.textContent = t.saving;
    msg.className = "msg";
    msg.textContent = "";
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.platform) body.tags = data.platform;
    try {
      const res = await fetch(`${appUrl}/api/sourcing/clip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-GRAFIQ-Clipper": "1" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `${t.failed} (${res.status})`);
      msg.className = "msg ok";
      msg.innerHTML = `<a href="${esc(appUrl + json.url)}" target="_blank">${esc(json.merged ? t.merged : t.saved)}</a>`;
    } catch (err) {
      msg.className = "msg error";
      msg.textContent = err.message || t.failed;
      btn.disabled = false;
      btn.textContent = t.save;
    }
  });
})();
