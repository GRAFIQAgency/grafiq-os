import type { TalentFilters } from "../types";
import { MOCK_TALENT } from "./mock-data";
import { matchesTalentFilters } from "./mock-match";
import { emptyResponse, type SourceConnector } from "./types";

/** Demo connector returning a deterministic in-memory talent pool. */
export const mockTalentConnector: SourceConnector = {
  id: "mock-talent",
  name: "Demo talent pool",
  type: "mock",
  supportedEntityTypes: ["talent"],
  async search({ entityType, filters, limit }) {
    if (entityType !== "talent") return emptyResponse();
    const talent = MOCK_TALENT.filter((t) => matchesTalentFilters(t, filters as TalentFilters)).slice(0, limit);
    return { talent, companies: [] };
  },
  async fetchDetails(entityType, sourceEntityId) {
    if (entityType !== "talent") return null;
    return MOCK_TALENT.find((t) => t.sourceEntityId === sourceEntityId) ?? null;
  },
  async testConnection() {
    return { ok: true, message: `${MOCK_TALENT.length} demo records` };
  },
};
