import { describe, expect, it } from "vitest";

import { buildGithubQuery, estimateSeniority, mapGithubUser, parseLocation, roleFromTechnologies, technologiesFromRepos, type GithubUser } from "./github-map";

const user: GithubUser = {
  login: "annanovak", name: "Anna Novak", bio: "Front-end dev who loves motion", location: "Prague, Czech Republic",
  blog: "annanovak.dev", email: null, company: "@studio", hireable: true, avatar_url: "https://avatars.example/a.png",
  html_url: "https://github.com/annanovak", public_repos: 42, followers: 120, created_at: "2015-03-01T00:00:00Z",
};
const repos = [
  { language: "TypeScript", topics: ["react", "nextjs"] },
  { language: "TypeScript", topics: ["gsap"] },
  { language: "JavaScript", topics: [] },
  { language: "Python", topics: [], fork: true },
];

describe("github mapping", () => {
  it("parses locations", () => {
    expect(parseLocation("Prague, Czech Republic")).toEqual({ city: "Prague", country: "Czech Republic" });
    expect(parseLocation("Czechia")).toEqual({ country: "Czech Republic" });
    expect(parseLocation("Berlin")).toEqual({ city: "Berlin" });
    expect(parseLocation(null)).toEqual({});
  });

  it("collects technologies from languages and topics, ignoring forks", () => {
    expect(technologiesFromRepos(repos)).toEqual(["TypeScript", "React", "Next.js", "GSAP", "JavaScript"]);
  });

  it("guesses a role", () => {
    expect(roleFromTechnologies(["TypeScript", "React"])).toBe("Front-end Developer");
    expect(roleFromTechnologies(["TypeScript", "Go"])).toBe("Full-stack Developer");
    expect(roleFromTechnologies(["Three.js"])).toBe("3D Designer");
    expect(roleFromTechnologies([])).toBeUndefined();
  });

  it("estimates seniority from account age and activity", () => {
    const now = new Date("2026-09-06");
    expect(estimateSeniority(user, now)).toEqual({ seniority: "lead", years: 11 });
    expect(estimateSeniority({ ...user, created_at: "2025-01-01T00:00:00Z", public_repos: 2, followers: 0 }, now).seniority).toBe("junior");
  });

  it("maps a user into a normalised candidate with stable ids and urls", () => {
    const t = mapGithubUser(user, repos, new Date("2026-09-06"));
    expect(t).toMatchObject({
      sourceEntityId: "annanovak", fullName: "Anna Novak", role: "Front-end Developer", city: "Prague", country: "Czech Republic",
      profileUrl: "https://github.com/annanovak", portfolioUrl: "https://annanovak.dev", availability: "available", seniority: "lead",
    });
    expect(t.summary).toContain("estimated");
  });

  it("builds search queries with language and location qualifiers", () => {
    expect(buildGithubQuery({ q: "webflow motion", technologies: ["React", "GSAP"], city: "Prague" })).toBe('"webflow" "motion" language:JavaScript location:"Prague" type:user');
    expect(buildGithubQuery({})).toBe("type:user");
  });
});
