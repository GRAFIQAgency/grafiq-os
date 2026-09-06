import type { EntityType } from "../types";
import { clipperConnector } from "./clipper";
import { csvImportConnector } from "./csv-import";
import { githubConnector } from "./github";
import { inboundApplicationConnector, manualConnector } from "./manual";
import { mockCompaniesConnector } from "./mock-companies";
import { mockTalentConnector } from "./mock-talent";
import type { SourceConnector } from "./types";

/**
 * All known connectors. To add a source: implement SourceConnector in a new
 * file, add it here, and insert its id into `sourcing_sources` (migration).
 * Enabling/disabling happens in Sourcing → Sources (persisted in the DB).
 */
export const connectors: readonly SourceConnector[] = [
  githubConnector,
  mockTalentConnector,
  mockCompaniesConnector,
  csvImportConnector,
  manualConnector,
  inboundApplicationConnector,
  clipperConnector,
];

export function getConnector(id: string): SourceConnector | undefined {
  return connectors.find((c) => c.id === id);
}

/** Connectors that actively search (manual/CSV ones are excluded). */
export function searchConnectorsFor(entityType: EntityType): SourceConnector[] {
  return connectors.filter((c) => c.supportedEntityTypes.includes(entityType) && c.type !== "csv" && c.type !== "manual");
}
