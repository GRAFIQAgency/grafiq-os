import type { CompanyFilters } from "../types";
import { MOCK_COMPANIES } from "./mock-data";
import { matchesCompanyFilters } from "./mock-match";
import { emptyResponse, type SourceConnector } from "./types";

/** Demo connector returning a deterministic in-memory company pool. */
export const mockCompaniesConnector: SourceConnector = {
  id: "mock-companies",
  name: "Demo company directory",
  type: "mock",
  supportedEntityTypes: ["company"],
  async search({ entityType, filters, limit }) {
    if (entityType !== "company") return emptyResponse();
    const companies = MOCK_COMPANIES.filter((c) => matchesCompanyFilters(c, filters as CompanyFilters)).slice(0, limit);
    return { talent: [], companies };
  },
  async fetchDetails(entityType, sourceEntityId) {
    if (entityType !== "company") return null;
    return MOCK_COMPANIES.find((c) => c.sourceEntityId === sourceEntityId) ?? null;
  },
  async testConnection() {
    return { ok: true, message: `${MOCK_COMPANIES.length} demo records` };
  },
};
