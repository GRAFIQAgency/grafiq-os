/**
 * Pure mapping from GitHub API payloads to NormalizedTalent. Kept separate
 * from the connector so it can be unit-tested without network access.
 */
import type { TalentSeniority } from "../types";
import type { NormalizedTalent } from "./types";

export interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  blog: string | null;
  email: string | null;
  company: string | null;
  hireable: boolean | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface GithubRepo {
  language: string | null;
  topics?: string[];
  stargazers_count?: number;
  fork?: boolean;
}

const COUNTRIES = [
  "czech republic", "czechia", "slovakia", "germany", "austria", "poland", "netherlands", "portugal", "spain", "france",
  "italy", "united kingdom", "uk", "ireland", "sweden", "norway", "denmark", "finland", "switzerland", "belgium",
  "hungary", "romania", "ukraine", "united states", "usa", "canada", "australia", "india", "brazil", "serbia", "croatia",
];
const COUNTRY_ALIASES: Record<string, string> = { czechia: "Czech Republic", "czech republic": "Czech Republic", uk: "United Kingdom", usa: "United States" };

/** "Prague, Czech Republic" → { city, country }. Single tokens are classified as country when recognised. */
export function parseLocation(location: string | null): { city?: string; country?: string } {
  if (!location) return {};
  const parts = location.split(/[,/|]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return {};
  const title = (s: string) => COUNTRY_ALIASES[s.toLowerCase()] ?? s;
  if (parts.length === 1) {
    return COUNTRIES.includes(parts[0].toLowerCase()) ? { country: title(parts[0]) } : { city: parts[0] };
  }
  const last = parts[parts.length - 1];
  return { city: parts[0], country: COUNTRIES.includes(last.toLowerCase()) ? title(last) : last };
}

const TOPIC_TECH: Record<string, string> = {
  react: "React", reactjs: "React", nextjs: "Next.js", "next-js": "Next.js", threejs: "Three.js", "three-js": "Three.js",
  gsap: "GSAP", webflow: "Webflow", tailwindcss: "Tailwind", tailwind: "Tailwind", vue: "Vue", nuxt: "Nuxt", svelte: "Svelte",
  angular: "Angular", nodejs: "Node.js", node: "Node.js", typescript: "TypeScript", figma: "Figma", shopify: "Shopify",
  wordpress: "WordPress", webgl: "WebGL", blender: "Blender", unity: "Unity",
};

/** Languages and framework topics across a user's repositories, most used first. */
export function technologiesFromRepos(repos: GithubRepo[]): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork) continue;
    if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    for (const topic of repo.topics ?? []) {
      const tech = TOPIC_TECH[topic.toLowerCase()];
      if (tech) counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 12);
}

/** Best-guess GRAFIQ role from the technology mix. */
export function roleFromTechnologies(tech: string[]): string | undefined {
  const set = new Set(tech.map((t) => t.toLowerCase()));
  if (!set.size) return undefined;
  if (set.has("three.js") || set.has("webgl") || set.has("blender")) return "3D Designer";
  if (set.has("webflow")) return "Webflow Developer";
  const frontend = ["javascript", "typescript", "react", "next.js", "vue", "svelte", "angular", "html", "css", "scss", "tailwind"].some((t) => set.has(t));
  const backend = ["python", "go", "java", "rust", "c#", "php", "ruby", "kotlin", "node.js", "elixir"].some((t) => set.has(t));
  if (frontend && backend) return "Full-stack Developer";
  if (frontend) return "Front-end Developer";
  if (backend) return "Full-stack Developer";
  return undefined;
}

/** Heuristic seniority from account age, activity and audience. Flagged as an estimate in the summary. */
export function estimateSeniority(user: GithubUser, now = new Date()): { seniority: TalentSeniority; years: number } {
  const years = Math.max(0, Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (365.25 * 86400000)));
  const activity = user.public_repos + user.followers / 5;
  if (years >= 8 && activity >= 40) return { seniority: "lead", years };
  if (years >= 5 && activity >= 20) return { seniority: "senior", years };
  if (years >= 2 && activity >= 8) return { seniority: "mid", years };
  return { seniority: "junior", years };
}

export function mapGithubUser(user: GithubUser, repos: GithubRepo[], now = new Date()): NormalizedTalent {
  const technologies = technologiesFromRepos(repos);
  const role = roleFromTechnologies(technologies);
  const { seniority, years } = estimateSeniority(user, now);
  const { city, country } = parseLocation(user.location);
  const blog = user.blog ? (user.blog.startsWith("http") ? user.blog : `https://${user.blog}`) : undefined;
  const summaryParts = [
    user.bio?.trim(),
    `GitHub: ${user.public_repos} public repos, ${user.followers} followers, account since ${new Date(user.created_at).getFullYear()}.`,
    "Seniority and role are estimated from public activity.",
  ].filter(Boolean);

  return {
    sourceEntityId: user.login.toLowerCase(),
    sourceUrl: user.html_url,
    fullName: user.name?.trim() || user.login,
    headline: user.bio?.trim().slice(0, 140) || (role ? `${role} (GitHub)` : undefined),
    role,
    email: user.email ?? undefined,
    profileUrl: user.html_url,
    portfolioUrl: blog,
    avatarUrl: user.avatar_url,
    country,
    city,
    seniority,
    availability: user.hireable ? "available" : "unknown",
    yearsExperience: years > 0 ? years : undefined,
    skills: technologies.slice(0, 6),
    technologies,
    summary: summaryParts.join(" "),
  };
}

/** Builds a GitHub user-search query from talent filters. */
export function buildGithubQuery(filters: { q?: string; technologies?: string[]; skills?: string[]; country?: string; city?: string; role?: string }): string {
  const parts: string[] = [];
  const words = [filters.q, filters.role].filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  if (words.length) parts.push(words.map((w) => `"${w.replace(/"/g, "")}"`).join(" "));
  const LANG_BY_TECH: Record<string, string> = {
    react: "JavaScript", "next.js": "TypeScript", typescript: "TypeScript", javascript: "JavaScript", "three.js": "JavaScript",
    gsap: "JavaScript", python: "Python", go: "Go", rust: "Rust", php: "PHP", java: "Java", swift: "Swift", kotlin: "Kotlin",
  };
  const langs = new Set<string>();
  for (const tech of [...(filters.technologies ?? []), ...(filters.skills ?? [])]) {
    const lang = LANG_BY_TECH[tech.toLowerCase()];
    if (lang) langs.add(lang);
  }
  for (const lang of langs) parts.push(`language:${lang}`);
  const location = filters.city || filters.country;
  if (location) parts.push(`location:"${location.replace(/"/g, "")}"`);
  parts.push("type:user");
  return parts.join(" ");
}
