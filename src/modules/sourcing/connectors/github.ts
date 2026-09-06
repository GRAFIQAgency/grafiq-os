import type { TalentFilters } from "../types";
import { buildGithubQuery, mapGithubUser, type GithubRepo, type GithubUser } from "./github-map";
import { emptyResponse, type SourceConnector } from "./types";

/**
 * GitHub connector — official REST API, public data only.
 * Set GITHUB_TOKEN (fine-grained token, no scopes needed) to raise limits:
 * unauthenticated search is 10 req/min, authenticated 30 req/min.
 * https://docs.github.com/en/rest/search
 */
const API = "https://api.github.com";
const DETAIL_LIMIT_UNAUTH = 12;
const DETAIL_LIMIT_AUTH = 40;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "grafiq-os-sourcing",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const when = reset ? new Date(Number(reset) * 1000).toISOString() : "later";
    throw new Error(`GitHub rate limit reached; resets at ${when}. Add GITHUB_TOKEN to raise the limit.`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const githubConnector: SourceConnector = {
  id: "github",
  name: "GitHub developers",
  type: "api",
  supportedEntityTypes: ["talent"],
  rateLimit: { requestsPerMinute: process.env.GITHUB_TOKEN ? 30 : 10 },

  async search({ entityType, filters, limit }) {
    if (entityType !== "talent") return emptyResponse();
    const query = buildGithubQuery(filters as TalentFilters);
    const detailLimit = Math.min(limit, process.env.GITHUB_TOKEN ? DETAIL_LIMIT_AUTH : DETAIL_LIMIT_UNAUTH);
    const result = await gh<{ items: { login: string }[] }>(`/search/users?q=${encodeURIComponent(query)}&per_page=${detailLimit}`);

    const talent = [];
    for (const item of result.items.slice(0, detailLimit)) {
      const [user, repos] = await Promise.all([
        gh<GithubUser>(`/users/${encodeURIComponent(item.login)}`),
        gh<GithubRepo[]>(`/users/${encodeURIComponent(item.login)}/repos?sort=updated&per_page=30`).catch(() => [] as GithubRepo[]),
      ]);
      talent.push(mapGithubUser(user, repos));
    }
    return { talent, companies: [] };
  },

  async fetchDetails(entityType, sourceEntityId) {
    if (entityType !== "talent") return null;
    const user = await gh<GithubUser>(`/users/${encodeURIComponent(sourceEntityId)}`);
    const repos = await gh<GithubRepo[]>(`/users/${encodeURIComponent(sourceEntityId)}/repos?sort=updated&per_page=30`).catch(() => [] as GithubRepo[]);
    return mapGithubUser(user, repos);
  },

  async testConnection() {
    const data = await gh<{ resources: { search: { remaining: number; limit: number }; core: { remaining: number; limit: number } } }>("/rate_limit");
    const auth = process.env.GITHUB_TOKEN ? "token" : "unauthenticated";
    return { ok: true, message: `${auth}; search ${data.resources.search.remaining}/${data.resources.search.limit} per min, core ${data.resources.core.remaining}/${data.resources.core.limit} per hour` };
  },
};
