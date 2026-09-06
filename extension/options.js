(async () => {
  const { appUrl, lang, t } = await clipperSettings();
  const $ = (id) => document.getElementById(id);
  $("title").textContent = t.optionsTitle;
  $("intro").textContent = t.optionsIntro;
  $("appUrlLabel").textContent = t.appUrl;
  $("langLabel").textContent = t.language;
  $("save").textContent = t.saveSettings;
  $("appUrl").value = appUrl;
  $("lang").value = lang;

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("msg");
    let url = $("appUrl").value.trim().replace(/\/+$/, "");
    if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;
    if (url) {
      const origin = new URL(url).origin;
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
      if (!granted) {
        msg.textContent = t.permissionDenied;
        msg.className = "msg error";
        return;
      }
    }
    await chrome.storage.sync.set({ appUrl: url, lang: $("lang").value });
    msg.textContent = t.settingsSaved;
    msg.className = "msg ok";
  });
})();
