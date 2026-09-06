import { emptyResponse, type SourceConnector } from "./types";

/** Records entered by a GRAFIQ user (referrals, platforms where we hold an account). */
export const manualConnector: SourceConnector = {
  id: "manual",
  name: "Manual entry",
  type: "manual",
  supportedEntityTypes: ["talent", "company"],
  async search() {
    return emptyResponse();
  },
  async testConnection() {
    return { ok: true, message: "Entered by users — no external connection" };
  },
};

/** Candidates who submitted the public application form themselves (with consent). */
export const inboundApplicationConnector: SourceConnector = {
  id: "inbound-application",
  name: "Inbound applications",
  type: "manual",
  supportedEntityTypes: ["talent"],
  async search() {
    return emptyResponse();
  },
  async testConnection() {
    return {
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      message: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Public form at /apply is active" : "SUPABASE_SERVICE_ROLE_KEY missing — /apply cannot save",
    };
  },
};
