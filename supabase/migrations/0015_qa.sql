-- GRAFIQ OS — QA / Delivery Quality v1
-- Reusable QA templates + per-project checklists. Checklist items are FROZEN
-- copies of template items (template edits never change project history).
-- Reuses: projects, project_members (item assignee), project_tasks (fix task),
-- auth.users / profiles (reviewer, approver), activity_log (QA events).
-- Run AFTER 0014_shared_proposals.sql.

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
create table public.qa_templates (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  name          text not null check (char_length(name) between 1 and 120),
  description   text,
  -- Recommended project type (projects.project_type value) or null.
  project_type  text,
  is_active     boolean not null default true,
  position      integer not null default 0,
  -- Stable key for seeded templates so they can be recognised / restored.
  seed_key      text unique
);

create table public.qa_template_items (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.qa_templates (id) on delete cascade,
  category      text not null check (char_length(category) between 1 and 80),
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  is_required   boolean not null default true,
  allow_na      boolean not null default false,
  position      integer not null default 0
);
create index qa_template_items_template_idx on public.qa_template_items (template_id, position);

-- ---------------------------------------------------------------------------
-- Project checklists (frozen snapshots)
-- ---------------------------------------------------------------------------
create table public.qa_checklists (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users (id) on delete set null,
  project_id                uuid not null references public.projects (id) on delete cascade,
  -- Where it came from; the content below never re-reads the template.
  template_id               uuid references public.qa_templates (id) on delete set null,
  template_name             text not null,
  title                     text not null check (char_length(title) between 1 and 160),
  status                    text not null default 'not_started'
                            check (status in ('not_started', 'in_progress', 'needs_fixes', 'ready_for_review', 'approved')),
  reviewer_id               uuid references auth.users (id) on delete set null,
  due_date                  date,
  required_for_completion   boolean not null default true,
  -- Large / repeated deliveries: how the batch was checked.
  delivery_quantity         numeric(12, 2) check (delivery_quantity is null or delivery_quantity >= 0),
  sample_quantity           numeric(12, 2) check (sample_quantity is null or sample_quantity >= 0),
  sampling_note             text,
  started_at                timestamptz,
  approved_at               timestamptz,
  approved_by               uuid references auth.users (id) on delete set null
);
create index qa_checklists_project_idx on public.qa_checklists (project_id, status);
create index qa_checklists_due_idx on public.qa_checklists (due_date);

create table public.qa_checklist_items (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  checklist_id        uuid not null references public.qa_checklists (id) on delete cascade,
  template_item_id    uuid references public.qa_template_items (id) on delete set null,
  -- FROZEN copy of the template item at creation time.
  category            text not null,
  title               text not null,
  description         text,
  is_required         boolean not null default true,
  allow_na            boolean not null default false,
  position            integer not null default 0,
  -- Review state
  status              text not null default 'pending' check (status in ('pending', 'pass', 'fail', 'na', 'blocked')),
  note                text,
  evidence_url        text,
  assignee_member_id  uuid references public.project_members (id) on delete set null,
  fix_task_id         uuid references public.project_tasks (id) on delete set null,
  checked_at          timestamptz,
  checked_by          uuid references auth.users (id) on delete set null
);
create index qa_checklist_items_checklist_idx on public.qa_checklist_items (checklist_id, position);
create index qa_checklist_items_status_idx on public.qa_checklist_items (checklist_id, status);

-- updated_at + RLS (every signed-in GRAFIQ user may manage QA; single company)
do $$
declare t text;
begin
  foreach t in array array['qa_templates', 'qa_checklists', 'qa_checklist_items']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['qa_templates', 'qa_template_items', 'qa_checklists', 'qa_checklist_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Authenticated users can manage %s" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seeded GRAFIQ templates (editable afterwards; recognised by seed_key)
-- ---------------------------------------------------------------------------
create or replace function public.qa_seed_item(p_template uuid, p_category text, p_title text, p_required boolean, p_allow_na boolean, p_pos integer, p_description text default null)
returns void language sql as $$
  insert into public.qa_template_items (template_id, category, title, description, is_required, allow_na, position)
  values (p_template, p_category, p_title, p_description, p_required, p_allow_na, p_pos);
$$;

do $$
declare t uuid;
begin
  -- WEBSITE QA
  insert into public.qa_templates (name, description, project_type, position, seed_key)
  values ('Website QA', 'Standard checks before a website goes live: responsive, functionality, browsers, content, SEO, technical, delivery.', 'website', 0, 'website')
  returning id into t;
  perform public.qa_seed_item(t, 'Responsive', 'Desktop layout', true, false, 0);
  perform public.qa_seed_item(t, 'Responsive', 'Tablet layout', true, false, 1);
  perform public.qa_seed_item(t, 'Responsive', 'Mobile layout', true, false, 2);
  perform public.qa_seed_item(t, 'Functionality', 'Forms submit and deliver', true, true, 3, 'Every form sends, validates and lands in the right inbox / CRM.');
  perform public.qa_seed_item(t, 'Functionality', 'Buttons and CTAs', true, false, 4);
  perform public.qa_seed_item(t, 'Functionality', 'Navigation and menus', true, false, 5);
  perform public.qa_seed_item(t, 'Functionality', 'Internal and external links', true, false, 6);
  perform public.qa_seed_item(t, 'Functionality', 'CMS works for the client', true, true, 7, 'Client can edit content in the CMS; collections and fields make sense.');
  perform public.qa_seed_item(t, 'Browser', 'Chrome', true, false, 8);
  perform public.qa_seed_item(t, 'Browser', 'Safari', true, false, 9);
  perform public.qa_seed_item(t, 'Browser', 'Mobile Safari (iPhone)', true, false, 10);
  perform public.qa_seed_item(t, 'Content', 'Copy checked (typos, placeholders)', true, false, 11);
  perform public.qa_seed_item(t, 'Content', 'Images checked (quality, alt texts)', true, false, 12);
  perform public.qa_seed_item(t, 'Content', 'No missing content', true, false, 13);
  perform public.qa_seed_item(t, 'SEO', 'Page titles', true, false, 14);
  perform public.qa_seed_item(t, 'SEO', 'Meta descriptions', true, false, 15);
  perform public.qa_seed_item(t, 'SEO', 'Open Graph image and texts', true, false, 16);
  perform public.qa_seed_item(t, 'SEO', 'Indexing settings correct for production', true, false, 17);
  perform public.qa_seed_item(t, 'SEO', 'Sitemap and robots.txt', false, true, 18);
  perform public.qa_seed_item(t, 'Technical', 'Favicon', true, false, 19);
  perform public.qa_seed_item(t, 'Technical', '404 page', true, false, 20);
  perform public.qa_seed_item(t, 'Technical', 'Analytics / tracking installed', true, true, 21);
  perform public.qa_seed_item(t, 'Technical', 'Performance sanity check', true, false, 22, 'Lighthouse or PageSpeed in a sane range; no huge images.');
  perform public.qa_seed_item(t, 'Technical', 'Production domain connected', true, false, 23);
  perform public.qa_seed_item(t, 'Technical', 'SSL / HTTPS', true, false, 24);
  perform public.qa_seed_item(t, 'Delivery', 'Staging reviewed with the client', true, false, 25);
  perform public.qa_seed_item(t, 'Delivery', 'Client requirements satisfied', true, false, 26);

  -- BRANDING QA
  insert into public.qa_templates (name, description, project_type, position, seed_key)
  values ('Branding QA', 'Final package checks for identity work: logo, colours, typography, exports, files, guidelines, delivery.', 'branding', 1, 'branding')
  returning id into t;
  perform public.qa_seed_item(t, 'Logo', 'Primary logo', true, false, 0);
  perform public.qa_seed_item(t, 'Logo', 'Alternative versions (horizontal, symbol)', true, true, 1);
  perform public.qa_seed_item(t, 'Logo', 'Monochrome version', true, false, 2);
  perform public.qa_seed_item(t, 'Logo', 'Vector source', true, false, 3);
  perform public.qa_seed_item(t, 'Colours', 'Palette documented', true, false, 4);
  perform public.qa_seed_item(t, 'Colours', 'HEX values', true, false, 5);
  perform public.qa_seed_item(t, 'Colours', 'RGB values', true, false, 6);
  perform public.qa_seed_item(t, 'Colours', 'CMYK values', false, true, 7, 'Only when print use is expected.');
  perform public.qa_seed_item(t, 'Typography', 'Font names documented', true, false, 8);
  perform public.qa_seed_item(t, 'Typography', 'Font licenses / links', true, true, 9);
  perform public.qa_seed_item(t, 'Typography', 'Hierarchy (headings, body, captions)', true, false, 10);
  perform public.qa_seed_item(t, 'Exports', 'SVG', true, false, 11);
  perform public.qa_seed_item(t, 'Exports', 'PDF', true, false, 12);
  perform public.qa_seed_item(t, 'Exports', 'PNG', true, false, 13);
  perform public.qa_seed_item(t, 'Exports', 'JPG', false, true, 14);
  perform public.qa_seed_item(t, 'Files', 'Clean folder structure', true, false, 15);
  perform public.qa_seed_item(t, 'Files', 'Consistent naming', true, false, 16);
  perform public.qa_seed_item(t, 'Files', 'Editable source files included', true, false, 17);
  perform public.qa_seed_item(t, 'Guidelines', 'Correct logo usage (clear space, minimum size, misuse)', true, false, 18);
  perform public.qa_seed_item(t, 'Guidelines', 'Colours section', true, false, 19);
  perform public.qa_seed_item(t, 'Guidelines', 'Typography section', true, false, 20);
  perform public.qa_seed_item(t, 'Guidelines', 'Examples / mockups', true, true, 21);
  perform public.qa_seed_item(t, 'Delivery', 'Final package reviewed', true, false, 22);
  perform public.qa_seed_item(t, 'Delivery', 'Client requirements satisfied', true, false, 23);

  -- 3D / CREATIVE QA
  insert into public.qa_templates (name, description, project_type, position, seed_key)
  values ('3D / Creative QA', 'Checks for 3D and creative production, including large batches of repeated units (use the sampling fields).', 'creative_3d', 2, 'creative_3d')
  returning id into t;
  perform public.qa_seed_item(t, 'Model', 'Dimensions / scale correct', true, false, 0);
  perform public.qa_seed_item(t, 'Model', 'Geometry clean (no holes, flipped normals, stray vertices)', true, false, 1);
  perform public.qa_seed_item(t, 'Model', 'Client specification followed', true, false, 2);
  perform public.qa_seed_item(t, 'Materials', 'Materials assigned', true, false, 3);
  perform public.qa_seed_item(t, 'Materials', 'Textures correct', true, false, 4);
  perform public.qa_seed_item(t, 'Materials', 'Texture resolution appropriate', true, false, 5);
  perform public.qa_seed_item(t, 'Visual', 'Lighting', true, false, 6);
  perform public.qa_seed_item(t, 'Visual', 'Camera / framing', true, false, 7);
  perform public.qa_seed_item(t, 'Visual', 'Colours match reference', true, false, 8);
  perform public.qa_seed_item(t, 'Visual', 'Product consistency across the set', true, true, 9);
  perform public.qa_seed_item(t, 'Output', 'Required render dimensions', true, false, 10);
  perform public.qa_seed_item(t, 'Output', 'Required file format', true, false, 11);
  perform public.qa_seed_item(t, 'Output', 'Transparent background', false, true, 12, 'Only when required by the client.');
  perform public.qa_seed_item(t, 'Output', 'Naming convention', true, false, 13);
  perform public.qa_seed_item(t, 'Source', 'Source file clean', true, false, 14);
  perform public.qa_seed_item(t, 'Source', 'Linked assets included', true, false, 15);
  perform public.qa_seed_item(t, 'Source', 'No missing textures', true, false, 16);
  perform public.qa_seed_item(t, 'Batch consistency', 'Units follow the same standard', true, true, 17);
  perform public.qa_seed_item(t, 'Batch consistency', 'Random sample checked (large batch)', true, true, 18, 'Record the sample size in the sampling fields of the checklist.');
  perform public.qa_seed_item(t, 'Delivery', 'Quantity matches required delivered units', true, false, 19);
  perform public.qa_seed_item(t, 'Delivery', 'Client specification satisfied', true, false, 20);

  -- MARKETING / CREATIVE CAMPAIGN QA
  insert into public.qa_templates (name, description, project_type, position, seed_key)
  values ('Marketing / Campaign QA', 'Checks before creatives and campaigns go out.', 'marketing', 3, 'marketing')
  returning id into t;
  perform public.qa_seed_item(t, 'Creatives', 'Correct creative dimensions per placement', true, false, 0);
  perform public.qa_seed_item(t, 'Creatives', 'Copy checked', true, false, 1);
  perform public.qa_seed_item(t, 'Creatives', 'Mobile variants', true, true, 2);
  perform public.qa_seed_item(t, 'Creatives', 'Approved creative version used', true, false, 3);
  perform public.qa_seed_item(t, 'Creatives', 'Exported formats', true, false, 4);
  perform public.qa_seed_item(t, 'Links & tracking', 'Links checked', true, false, 5);
  perform public.qa_seed_item(t, 'Links & tracking', 'Tracking / UTM parameters', true, true, 6);
  perform public.qa_seed_item(t, 'Setup', 'Correct campaign / client naming', true, false, 7);
  perform public.qa_seed_item(t, 'Delivery', 'Client brief satisfied', true, false, 8);

  -- GENERIC DELIVERY QA
  insert into public.qa_templates (name, description, project_type, position, seed_key)
  values ('Generic Delivery QA', 'For project types without a specialised template.', 'other', 4, 'generic')
  returning id into t;
  perform public.qa_seed_item(t, 'Scope', 'All agreed deliverables present', true, false, 0);
  perform public.qa_seed_item(t, 'Scope', 'Client brief and requirements satisfied', true, false, 1);
  perform public.qa_seed_item(t, 'Quality', 'Internal review by a second person', true, false, 2);
  perform public.qa_seed_item(t, 'Quality', 'Copy and visuals checked', true, false, 3);
  perform public.qa_seed_item(t, 'Files', 'Naming and folder structure', true, false, 4);
  perform public.qa_seed_item(t, 'Files', 'Source / editable files included', true, true, 5);
  perform public.qa_seed_item(t, 'Delivery', 'Handover package reviewed', true, false, 6);
  perform public.qa_seed_item(t, 'Delivery', 'Client sign-off requested', false, true, 7);
end $$;

drop function public.qa_seed_item(uuid, text, text, boolean, boolean, integer, text);
