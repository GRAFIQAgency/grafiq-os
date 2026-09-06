import { emptyResponse, type SourceConnector } from "./types";

/**
 * Browser-extension clipper: a person saves the profile they are looking at,
 * one at a time, as a logged-in human. Data arrives via /api/sourcing/clip.
 */
export const clipperConnector: SourceConnector = {
  id: "clipper",
  name: "Browser clipper",
  type: "manual",
  supportedEntityTypes: ["talent"],
  async search() {
    return emptyResponse();
  },
  async testConnection() {
    return { ok: true, message: "Receives clips from the GRAFIQ Clipper extension" };
  },
};
