-- GRAFIQ OS — Sourcing: register the browser clipper connector. Run AFTER 0005.
insert into public.sourcing_sources (id, enabled) values ('clipper', true)
on conflict (id) do nothing;
