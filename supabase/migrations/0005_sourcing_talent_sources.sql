-- GRAFIQ OS — Sourcing: register talent connectors (GitHub API, manual entry, inbound applications).
-- Run AFTER 0004_sourcing.sql.

insert into public.sourcing_sources (id, enabled) values
  ('github', true),
  ('manual', true),
  ('inbound-application', true)
on conflict (id) do nothing;
