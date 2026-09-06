// Tiny EN/CS dictionary for the extension UI (mirrors the app's language switcher idea).
const CLIPPER_I18N = {
  en: {
    save: "Save to GRAFIQ OS", saving: "Saving…", saved: "Saved. Open in GRAFIQ OS", merged: "Merged into an existing candidate. Open",
    notConfigured: "Set your GRAFIQ OS address in the extension options first.", openOptions: "Open options",
    notLoggedIn: "You are not signed in to GRAFIQ OS. Sign in, then try again.", signIn: "Open GRAFIQ OS",
    reading: "Reading page…", nothing: "Could not read a profile on this page. You can still fill in the fields.",
    platform: "Platform", fullName: "Full name", headline: "Headline", role: "Role", email: "Email", country: "Country", city: "City",
    rate: "Hourly rate", currency: "Currency", skills: "Skills (comma separated)", portfolioUrl: "Portfolio URL", summary: "Summary",
    sourceUrl: "Source URL", failed: "Save failed", compliance: "Save only what you can see yourself, one profile at a time, and respect each platform's terms.",
    optionsTitle: "GRAFIQ Clipper settings", optionsIntro: "Where is your GRAFIQ OS running? The clipper sends clips there using your existing login.",
    appUrl: "GRAFIQ OS address", language: "Language", saveSettings: "Save settings", settingsSaved: "Saved.", permissionDenied: "Permission for that address was not granted.",
  },
  cs: {
    save: "Uložit do GRAFIQ OS", saving: "Ukládám…", saved: "Uloženo. Otevřít v GRAFIQ OS", merged: "Sloučeno s existujícím kandidátem. Otevřít",
    notConfigured: "Nejprve nastavte adresu GRAFIQ OS v možnostech rozšíření.", openOptions: "Otevřít nastavení",
    notLoggedIn: "Nejste přihlášeni do GRAFIQ OS. Přihlaste se a zkuste to znovu.", signIn: "Otevřít GRAFIQ OS",
    reading: "Čtu stránku…", nothing: "Na této stránce se nepodařilo přečíst profil. Pole můžete vyplnit ručně.",
    platform: "Platforma", fullName: "Celé jméno", headline: "Titulek", role: "Role", email: "E-mail", country: "Země", city: "Město",
    rate: "Hodinová sazba", currency: "Měna", skills: "Dovednosti (oddělené čárkou)", portfolioUrl: "URL portfolia", summary: "Shrnutí",
    sourceUrl: "URL zdroje", failed: "Uložení selhalo", compliance: "Ukládejte jen to, co sami vidíte, po jednom profilu, a respektujte podmínky každé platformy.",
    optionsTitle: "Nastavení GRAFIQ Clipperu", optionsIntro: "Kde běží vaše GRAFIQ OS? Clipper tam posílá záznamy s vaším stávajícím přihlášením.",
    appUrl: "Adresa GRAFIQ OS", language: "Jazyk", saveSettings: "Uložit nastavení", settingsSaved: "Uloženo.", permissionDenied: "Oprávnění pro tuto adresu nebylo uděleno.",
  },
};

async function clipperSettings() {
  const { appUrl = "", lang = "en" } = await chrome.storage.sync.get(["appUrl", "lang"]);
  return { appUrl: appUrl.replace(/\/+$/, ""), lang: CLIPPER_I18N[lang] ? lang : "en", t: CLIPPER_I18N[CLIPPER_I18N[lang] ? lang : "en"] };
}
