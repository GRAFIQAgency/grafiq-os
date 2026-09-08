-- GRAFIQ OS — Public pricing-plan links without the service-role key
-- /p/<token> reads ONE shared plan by its unguessable token through this
-- SECURITY DEFINER function. Anonymous visitors cannot list or query the
-- table itself (RLS stays "authenticated only"); they can only call the
-- function with a token they were given. Run AFTER 0013_unit_pricing.sql.

create or replace function public.get_shared_proposal(p_token text)
returns setof public.pricing_proposals
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.pricing_proposals
  where share_token = p_token
    and status = 'shared'
  limit 1;
$$;

revoke all on function public.get_shared_proposal(text) from public;
grant execute on function public.get_shared_proposal(text) to anon, authenticated;

comment on function public.get_shared_proposal(text) is 'Public read of a single shared pricing plan by share token (used by /p/<token>).';
