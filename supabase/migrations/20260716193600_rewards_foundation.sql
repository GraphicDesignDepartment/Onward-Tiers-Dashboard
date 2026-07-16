-- Onward Customs rewards foundation
-- Development-first schema. No production PII is included.

create extension if not exists pgcrypto with schema extensions;

create type public.account_kind as enum ('individual', 'company');
create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.verification_status as enum ('draft', 'submitted', 'approved', 'rejected');
create type public.import_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.reward_accounts (
  id uuid primary key default gen_random_uuid(),
  kind public.account_kind not null,
  display_name text not null,
  normalized_key text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  individual_account_id uuid unique references public.reward_accounts(id) on delete restrict,
  display_name text not null,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_individual_account_kind check (individual_account_id is not null or role <> 'customer')
);

create table public.companies (
  id uuid primary key references public.reward_accounts(id) on delete cascade,
  legal_name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_account_manager boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

create or replace function public.enforce_reward_account_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_kind public.account_kind;
  actual_kind public.account_kind;
begin
  if tg_table_name = 'companies' then
    expected_kind := 'company';
    select kind into actual_kind from public.reward_accounts where id = new.id;
  elsif tg_table_name = 'profiles' and new.individual_account_id is not null then
    expected_kind := 'individual';
    select kind into actual_kind from public.reward_accounts where id = new.individual_account_id;
  else
    return new;
  end if;

  if actual_kind is distinct from expected_kind then
    raise exception 'Reward account must have kind % for table %', expected_kind, tg_table_name;
  end if;
  return new;
end;
$$;

create trigger companies_enforce_account_kind
before insert or update of id on public.companies
for each row execute function public.enforce_reward_account_kind();
create trigger profiles_enforce_account_kind
before insert or update of individual_account_id on public.profiles
for each row execute function public.enforce_reward_account_kind();

create table public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.reward_accounts(id) on delete cascade,
  provider text not null default 'deconetwork',
  external_customer_id text,
  normalized_email text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_identity_locator check (external_customer_id is not null or normalized_email is not null)
);

create unique index customer_identities_provider_external_uidx
  on public.customer_identities(provider, external_customer_id)
  where external_customer_id is not null;
create index customer_identities_email_idx on public.customer_identities(normalized_email)
  where normalized_email is not null;

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'deconetwork_csv',
  file_name text not null,
  file_sha256 text not null unique,
  status public.import_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_inserted integer not null default 0 check (rows_inserted >= 0),
  rows_updated integer not null default 0 check (rows_updated >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.import_runs(id) on delete set null,
  external_order_number text not null unique,
  account_id uuid not null references public.reward_accounts(id) on delete restrict,
  site_id text not null,
  site_name text not null,
  order_type text not null,
  status text not null,
  ordered_at timestamptz not null,
  paid_at timestamptz,
  amount_billed numeric(12,2) not null default 0 check (amount_billed >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  rush_order_cost numeric(12,2) not null default 0 check (rush_order_cost >= 0),
  other_fee_total numeric(12,2) not null default 0 check (other_fee_total >= 0),
  coupon_discount numeric(12,2) not null default 0 check (coupon_discount >= 0),
  credits numeric(12,2) not null default 0 check (credits >= 0),
  qualifying_spend numeric(12,2) generated always as (
    case
      when lower(status) = 'paid in full' and site_id <> '27457826'
        then greatest(amount_billed - tax_total - shipping_total - rush_order_cost - other_fee_total, 0::numeric)
      else 0::numeric
    end
  ) stored,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_account_ordered_idx on public.orders(account_id, ordered_at desc);
create index orders_site_status_idx on public.orders(site_id, status);
create index orders_qualifying_idx on public.orders(account_id, ordered_at)
  where qualifying_spend > 0;

create table public.tier_definitions (
  id text primary key,
  display_name text not null,
  rank smallint not null unique check (rank > 0),
  annual_threshold numeric(12,2) not null unique check (annual_threshold >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.tier_definitions (id, display_name, rank, annual_threshold, discount_percent) values
  ('beginner', 'Onward Beginner', 1, 0, 0),
  ('bronze', 'Onward Plus — Bronze', 2, 500, 0),
  ('silver', 'Onward Preferred — Silver', 3, 2500, 5),
  ('gold', 'Onward Corporate — Gold', 4, 5000, 10);

create table public.tier_achievements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.reward_accounts(id) on delete cascade,
  tier_id text not null references public.tier_definitions(id) on delete restrict,
  qualifying_year integer not null check (qualifying_year between 2020 and 2200),
  annual_qualifying_spend numeric(12,2) not null check (annual_qualifying_spend >= 0),
  achieved_at date not null,
  protected_through date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, qualifying_year),
  constraint achievement_protection_check check (protected_through >= achieved_at)
);

create index tier_achievements_current_idx
  on public.tier_achievements(account_id, protected_through desc);

create table public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.reward_accounts(id) on delete restrict,
  reward_type text not null,
  amount numeric(12,2) not null check (amount <> 0),
  description text not null,
  source_order_id uuid references public.orders(id) on delete set null,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index reward_ledger_account_idx on public.reward_ledger(account_id, created_at desc);

create table public.benefit_definitions (
  id text primary key,
  name text not null,
  unit text not null,
  tier_id text references public.tier_definitions(id) on delete set null,
  annual_allowance numeric(12,2),
  reseller_only boolean not null default false,
  stackable boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint benefit_allowance_check check (annual_allowance is null or annual_allowance >= 0)
);

insert into public.benefit_definitions (id, name, unit, tier_id, annual_allowance, reseller_only, stackable) values
  ('beginner_artwork_hours', 'Artwork hours', 'hours', 'beginner', 1, false, false),
  ('bronze_artwork_hours', 'Artwork hours', 'hours', 'bronze', 2, false, false),
  ('silver_artwork_hours', 'Artwork hours', 'hours', 'silver', 6, false, false),
  ('gold_artwork_hours', 'Artwork hours', 'hours', 'gold', 12, false, false),
  ('silver_site_visit', 'Site visit', 'visits', 'silver', 1, false, false),
  ('gold_site_visits', 'Site visits', 'visits', 'gold', 2, false, false),
  ('silver_garment_sample', 'Garment sample', 'samples', 'silver', 1, false, false),
  ('gold_garment_samples', 'Garment samples', 'samples', 'gold', 2, false, false),
  ('referral_credit', 'Referral credit', 'USD', null, null, false, true),
  ('reseller_pricing', 'Reseller/decorator pricing', 'status', null, null, true, false);

create table public.benefit_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.reward_accounts(id) on delete restrict,
  benefit_id text not null references public.benefit_definitions(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  usage_year integer not null check (usage_year between 2020 and 2200),
  description text not null,
  source_order_id uuid references public.orders(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index benefit_usage_account_year_idx
  on public.benefit_usage(account_id, usage_year, benefit_id);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.reward_accounts(id) on delete cascade,
  program text not null default 'reseller_decorator',
  status public.verification_status not null default 'draft',
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_requests_account_idx
  on public.verification_requests(account_id, created_at desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

-- Automatically maintain updated_at columns.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reward_accounts_set_updated_at before update on public.reward_accounts
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger customer_identities_set_updated_at before update on public.customer_identities
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger tier_achievements_set_updated_at before update on public.tier_achievements
for each row execute function public.set_updated_at();
create trigger verification_requests_set_updated_at before update on public.verification_requests
for each row execute function public.set_updated_at();

-- Ledger and audit records are corrected by compensating entries, never mutation.
create or replace function public.prevent_immutable_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% records are immutable; add a compensating record instead', tg_table_name;
end;
$$;

create trigger reward_ledger_immutable before update or delete on public.reward_ledger
for each row execute function public.prevent_immutable_mutation();
create trigger benefit_usage_immutable before update or delete on public.benefit_usage
for each row execute function public.prevent_immutable_mutation();
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.prevent_immutable_mutation();

-- Deterministic tier calculation views.
create view public.account_qualifying_order_running
with (security_invoker = true)
as
select
  o.id as order_id,
  o.account_id,
  extract(year from o.ordered_at)::integer as qualifying_year,
  o.ordered_at,
  o.qualifying_spend,
  sum(o.qualifying_spend) over (
    partition by o.account_id, extract(year from o.ordered_at)
    order by o.ordered_at, o.id
    rows between unbounded preceding and current row
  ) as running_qualifying_spend
from public.orders o
where o.qualifying_spend > 0;

create view public.account_year_spend
with (security_invoker = true)
as
select
  o.account_id,
  extract(year from o.ordered_at)::integer as qualifying_year,
  count(*) filter (where o.qualifying_spend > 0) as qualifying_order_count,
  sum(o.qualifying_spend) as annual_qualifying_spend
from public.orders o
where o.qualifying_spend > 0
group by o.account_id, extract(year from o.ordered_at);

create view public.account_year_tiers
with (security_invoker = true)
as
with crossings as (
  select
    r.account_id,
    r.qualifying_year,
    t.id as tier_id,
    t.display_name,
    t.rank,
    t.annual_threshold,
    min(r.ordered_at)::date as achieved_at
  from public.account_qualifying_order_running r
  join public.tier_definitions t
    on t.active
   and r.running_qualifying_spend >= t.annual_threshold
   and r.running_qualifying_spend > 0
  group by r.account_id, r.qualifying_year, t.id, t.display_name, t.rank, t.annual_threshold
), ranked as (
  select c.*, row_number() over (
    partition by c.account_id, c.qualifying_year
    order by c.rank desc
  ) as tier_choice
  from crossings c
)
select
  r.account_id,
  r.qualifying_year,
  r.tier_id,
  r.display_name,
  r.rank,
  r.annual_threshold,
  s.annual_qualifying_spend,
  r.achieved_at,
  make_date(r.qualifying_year + 1, 12, 31) as protected_through
from ranked r
join public.account_year_spend s
  on s.account_id = r.account_id and s.qualifying_year = r.qualifying_year
where r.tier_choice = 1;

create view public.account_current_tiers
with (security_invoker = true)
as
with candidates as (
  select
    a.*,
    row_number() over (
      partition by a.account_id
      order by t.rank desc, a.qualifying_year desc
    ) as current_choice
  from public.tier_achievements a
  join public.tier_definitions t on t.id = a.tier_id
  where a.protected_through >= current_date
)
select
  c.account_id,
  c.tier_id,
  t.display_name,
  t.rank,
  t.annual_threshold,
  c.annual_qualifying_spend,
  c.qualifying_year,
  c.achieved_at,
  c.protected_through
from candidates c
join public.tier_definitions t on t.id = c.tier_id
where c.current_choice = 1;

create view public.account_reward_balances
with (security_invoker = true)
as
select
  account_id,
  reward_type,
  sum(amount) filter (where expires_at is null or expires_at > now()) as available_balance,
  sum(amount) as lifetime_net_amount
from public.reward_ledger
group by account_id, reward_type;

create view public.account_benefit_usage
with (security_invoker = true)
as
select account_id, benefit_id, usage_year, sum(quantity) as quantity_used
from public.benefit_usage
group by account_id, benefit_id, usage_year;

create or replace function public.rebuild_tier_achievements(p_account_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tier_achievements
  where p_account_id is null or account_id = p_account_id;

  insert into public.tier_achievements (
    account_id, tier_id, qualifying_year, annual_qualifying_spend, achieved_at, protected_through
  )
  select account_id, tier_id, qualifying_year, annual_qualifying_spend, achieved_at, protected_through
  from public.account_year_tiers
  where p_account_id is null or account_id = p_account_id;
end;
$$;

create or replace function public.sync_order_tier_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.rebuild_tier_achievements(old.account_id);
    return old;
  end if;

  perform public.rebuild_tier_achievements(new.account_id);
  if tg_op = 'UPDATE' and old.account_id <> new.account_id then
    perform public.rebuild_tier_achievements(old.account_id);
  end if;
  return new;
end;
$$;

create trigger orders_sync_tiers
after insert or update or delete on public.orders
for each row execute function public.sync_order_tier_achievement();

-- RLS helpers. These execute as the function owner to avoid policy recursion.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  );
$$;

create or replace function public.can_access_account(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.individual_account_id = target_account_id
    )
    or exists (
      select 1 from public.company_memberships m
      where m.profile_id = auth.uid() and m.company_id = target_account_id
    );
$$;

alter table public.reward_accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.customer_identities enable row level security;
alter table public.import_runs enable row level security;
alter table public.orders enable row level security;
alter table public.tier_definitions enable row level security;
alter table public.tier_achievements enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.benefit_definitions enable row level security;
alter table public.benefit_usage enable row level security;
alter table public.verification_requests enable row level security;
alter table public.audit_events enable row level security;

create policy reward_accounts_read on public.reward_accounts for select to authenticated
using (public.can_access_account(id));
create policy profiles_read on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff());
create policy companies_read on public.companies for select to authenticated
using (public.can_access_account(id));
create policy company_memberships_read on public.company_memberships for select to authenticated
using (profile_id = auth.uid() or public.is_staff());
create policy customer_identities_staff on public.customer_identities for all to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy import_runs_staff on public.import_runs for all to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy orders_read on public.orders for select to authenticated
using (public.can_access_account(account_id));
create policy tiers_read on public.tier_definitions for select to authenticated using (true);
create policy achievements_read on public.tier_achievements for select to authenticated
using (public.can_access_account(account_id));
create policy rewards_read on public.reward_ledger for select to authenticated
using (public.can_access_account(account_id));
create policy benefit_definitions_read on public.benefit_definitions for select to authenticated using (true);
create policy benefit_usage_read on public.benefit_usage for select to authenticated
using (public.can_access_account(account_id));
create policy verification_read on public.verification_requests for select to authenticated
using (public.can_access_account(account_id));
create policy verification_create on public.verification_requests for insert to authenticated
with check (public.can_access_account(account_id) and status in ('draft', 'submitted'));
create policy verification_owner_update on public.verification_requests for update to authenticated
using (public.can_access_account(account_id) and status in ('draft', 'submitted'))
with check (public.can_access_account(account_id) and status in ('draft', 'submitted'));
create policy verification_staff_update on public.verification_requests for update to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy audit_staff_read on public.audit_events for select to authenticated
using (public.is_staff());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.reward_accounts, public.profiles, public.companies,
  public.company_memberships, public.orders, public.tier_definitions,
  public.tier_achievements, public.reward_ledger, public.benefit_definitions,
  public.benefit_usage, public.verification_requests,
  public.account_qualifying_order_running, public.account_year_spend,
  public.account_year_tiers, public.account_current_tiers,
  public.account_reward_balances, public.account_benefit_usage
  to authenticated;
grant insert on public.verification_requests to authenticated;
grant select, update on public.verification_requests to authenticated;
grant select, insert, update, delete on public.customer_identities, public.import_runs to authenticated;
grant select on public.audit_events to authenticated;

grant usage on type public.verification_status to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;
revoke execute on function public.rebuild_tier_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.sync_order_tier_achievement() from public, anon, authenticated;

comment on column public.orders.qualifying_spend is
  'Paid-in-full amount after tax, shipping, rush charges, and other non-product fees; Onward Blanks is always excluded.';
comment on table public.reward_ledger is 'Immutable ledger; corrections use compensating entries.';
comment on table public.audit_events is 'Append-only administrative and security audit history.';
