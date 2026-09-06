/**
 * Deterministic demo dataset for the mock connectors. Stable ids mean re-running
 * a search yields the same people/companies, which exercises deduplication.
 * Replace/disable the mock connectors once real permitted sources exist.
 */
import type { NormalizedCompany, NormalizedTalent } from "./types";

const FIRST = ["Anna", "Jakub", "Tereza", "Lukas", "Eliska", "Martin", "Klara", "Tomas", "Nina", "Filip", "Sara", "Ondrej"];
const LAST = ["Novak", "Dvorak", "Svoboda", "Prochazka", "Kral", "Horak", "Nemec", "Pokorny", "Marek", "Benes", "Fiala", "Sedlak"];
const CITIES: [string, string][] = [
  ["Czech Republic", "Prague"], ["Czech Republic", "Brno"], ["Slovakia", "Bratislava"], ["Germany", "Berlin"],
  ["Austria", "Vienna"], ["Poland", "Warsaw"], ["Netherlands", "Amsterdam"], ["Portugal", "Lisbon"],
];
const ROLE_SKILLS: Record<string, { skills: string[]; tech: string[] }> = {
  "Webflow Developer": { skills: ["Webflow", "CMS", "Responsive", "JavaScript", "Interactions"], tech: ["Webflow", "GSAP", "Figma"] },
  "UI/UX Designer": { skills: ["UX", "UI", "Prototyping", "Design Systems", "Research"], tech: ["Figma", "Framer"] },
  "Front-end Developer": { skills: ["JavaScript", "TypeScript", "Responsive", "Animation"], tech: ["React", "Next.js", "GSAP"] },
  "Brand Designer": { skills: ["Branding", "Typography", "Identity", "Art Direction"], tech: ["Adobe", "Figma"] },
  "3D Designer": { skills: ["3D", "Rendering", "Product Visualisation"], tech: ["Blender", "Cinema 4D", "Three.js"] },
  "Motion Designer": { skills: ["Motion", "Animation", "Storyboarding"], tech: ["Adobe", "Cinema 4D", "GSAP"] },
  "Copywriter": { skills: ["Copywriting", "UX Writing", "Tone of Voice"], tech: ["Webflow"] },
  "PPC Specialist": { skills: ["Paid Media", "Analytics", "Conversion"], tech: ["Meta Ads", "Google Ads"] },
  "Project Manager": { skills: ["Delivery", "Client Communication", "Agile"], tech: ["Figma", "Webflow"] },
  "Full-stack Developer": { skills: ["TypeScript", "APIs", "Databases"], tech: ["React", "Next.js"] },
};
const ROLES = Object.keys(ROLE_SKILLS);
const SENIORITY = ["junior", "mid", "senior", "lead"] as const;
const EMPLOYMENT = ["freelancer", "contractor", "employee"] as const;
const AVAILABILITY = ["available", "limited", "unavailable", "unknown"] as const;
const LANGS = [["Czech", "English"], ["English"], ["Slovak", "English"], ["German", "English"], ["English", "Polish"]];

export const MOCK_TALENT: NormalizedTalent[] = Array.from({ length: 60 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const role = ROLES[i % ROLES.length];
  const [country, city] = CITIES[(i * 3) % CITIES.length];
  const seniority = SENIORITY[(i * 5) % SENIORITY.length];
  const years = seniority === "junior" ? 1 + (i % 2) : seniority === "mid" ? 3 + (i % 3) : seniority === "senior" ? 6 + (i % 4) : 9 + (i % 5);
  const baseRate = seniority === "junior" ? 20 : seniority === "mid" ? 35 : seniority === "senior" ? 50 : 65;
  const { skills, tech } = ROLE_SKILLS[role];
  const extraTech = tech.length > 1 && i % 3 === 0 ? tech : tech.slice(0, 1 + (i % tech.length));
  const slug = `${first}-${last}-${i}`.toLowerCase();
  return {
    sourceEntityId: `mock-${i}`,
    sourceUrl: `https://portfolio.example/${slug}`,
    fullName: `${first} ${last}`,
    headline: `${seniority[0].toUpperCase()}${seniority.slice(1)} ${role}`,
    role,
    email: i % 4 === 0 ? `${slug}@example.com` : undefined,
    profileUrl: `https://profiles.example/${slug}`,
    portfolioUrl: i % 5 === 4 ? undefined : `https://portfolio.example/${slug}`,
    country,
    city,
    remote: i % 3 !== 1,
    seniority,
    employmentType: EMPLOYMENT[(i * 2) % EMPLOYMENT.length],
    hourlyRateMin: baseRate,
    hourlyRateMax: baseRate + 15,
    rateCurrency: "EUR",
    availability: AVAILABILITY[(i * 3) % AVAILABILITY.length],
    yearsExperience: years,
    agencyExperience: i % 2 === 0,
    skills: skills.slice(0, 2 + (i % (skills.length - 1))),
    technologies: extraTech,
    languages: LANGS[i % LANGS.length],
    summary: `${role} based in ${city} with ${years} years of experience. ${i % 2 === 0 ? "Has worked with agencies on client projects." : "Mostly product/in-house background."}`,
  };
});

const COMPANY_NAMES = ["Nordlicht", "Vltava", "Kavka", "Orbis", "Stellar", "Brix", "Lumen", "Terra", "Fjord", "Quanta", "Helios", "Verdant"];
const COMPANY_SUFFIX = ["Labs", "Group", "Hotels", "Software", "Studio", "Digital", "Foods", "Estates", "Health", "Logistics"];
const INDUSTRY_BY_TYPE: Record<string, string> = {
  saas: "SaaS", ecommerce: "E-commerce", services: "Consulting", agency: "Agency",
  manufacturing: "Manufacturing", hospitality: "Hospitality", real_estate: "Real Estate", other: "Other",
};
const TYPES = ["saas", "ecommerce", "services", "hospitality", "real_estate", "manufacturing", "saas", "ecommerce"] as const;
const SIGNAL_POOL: { type: string; strength: "low" | "medium" | "high"; confidence: number; description: string }[] = [
  { type: "hiring_marketing", strength: "high", confidence: 0.8, description: "Job post: Marketing Manager (public careers page)" },
  { type: "old_website", strength: "medium", confidence: 0.6, description: "Site appears unchanged for 3+ years" },
  { type: "recently_funded", strength: "high", confidence: 0.85, description: "Seed round announced in press release" },
  { type: "hiring_designer", strength: "medium", confidence: 0.7, description: "Job post: Product Designer" },
  { type: "launching_product", strength: "medium", confidence: 0.6, description: "Product launch mentioned on blog" },
  { type: "new_market", strength: "medium", confidence: 0.55, description: "Opened German-language site" },
  { type: "rebrand", strength: "high", confidence: 0.75, description: "Announced upcoming rebrand" },
  { type: "poor_mobile", strength: "medium", confidence: 0.5, description: "Mobile layout issues detected" },
  { type: "outdated_tech", strength: "low", confidence: 0.5, description: "Legacy CMS detected" },
  { type: "rapid_growth", strength: "high", confidence: 0.7, description: "Headcount +40 % year over year" },
];
const WEB_TECH = [["WordPress"], ["Webflow"], ["Shopify"], ["WordPress", "HubSpot"], ["Custom"], ["Wix"]];

export const MOCK_COMPANIES: NormalizedCompany[] = Array.from({ length: 48 }, (_, i) => {
  const name = `${COMPANY_NAMES[i % COMPANY_NAMES.length]} ${COMPANY_SUFFIX[(i * 3) % COMPANY_SUFFIX.length]}`;
  const [country, city] = CITIES[(i * 5) % CITIES.length];
  const type = TYPES[i % TYPES.length];
  const employees = [8, 24, 42, 75, 130, 260, 15, 55][i % 8] + (i % 5) * 3;
  const domain = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
  const signals = [SIGNAL_POOL[i % SIGNAL_POOL.length], SIGNAL_POOL[(i * 3 + 1) % SIGNAL_POOL.length]]
    .filter((s, idx, arr) => arr.findIndex((x) => x.type === s.type) === idx);
  return {
    sourceEntityId: `mock-co-${i}`,
    sourceUrl: `https://${domain}`,
    name,
    website: `https://www.${domain}`,
    industry: INDUSTRY_BY_TYPE[type],
    country,
    city,
    employeeCount: employees,
    foundedYear: 2005 + (i % 18),
    description: `${INDUSTRY_BY_TYPE[type]} company in ${city} with about ${employees} employees.`,
    technologies: WEB_TECH[i % WEB_TECH.length],
    keywords: [INDUSTRY_BY_TYPE[type].toLowerCase(), city.toLowerCase(), type === "saas" ? "startup" : "established"],
    businessModel: type === "ecommerce" || type === "hospitality" ? "b2c" : "b2b",
    companyType: type,
    language: country === "Czech Republic" ? "cs" : country === "Germany" || country === "Austria" ? "de" : "en",
    signals: signals.map((s) => ({ ...s, detectedAt: new Date(Date.now() - (i % 30) * 86400000).toISOString() })),
    contacts: i % 4 === 0 ? [{ name: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`, jobTitle: "Marketing Manager", profileUrl: `https://profiles.example/${domain}` }] : [],
  };
});
