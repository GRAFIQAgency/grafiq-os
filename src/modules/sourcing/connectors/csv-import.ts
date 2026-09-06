import { emptyResponse, type SourceConnector } from "./types";

/**
 * CSV import is a "manual" connector: it never searches on its own. Records
 * are pushed through the same ingest pipeline by the import action, tagged
 * with this connector id so source records stay traceable.
 */
export const csvImportConnector: SourceConnector = {
  id: "csv-import",
  name: "CSV import",
  type: "csv",
  supportedEntityTypes: ["talent", "company"],
  async search() {
    return emptyResponse();
  },
  async testConnection() {
    return { ok: true, message: "Manual import — no external connection" };
  },
};
