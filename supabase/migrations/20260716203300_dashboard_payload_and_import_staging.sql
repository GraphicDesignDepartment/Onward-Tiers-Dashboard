-- Complete database-backed customer payload and staff-only CSV staging.

alter table public.orders add column order_label text not null default 'Onward Customs order';
alter table public.orders add column final_discount numeric(12,2) not null default 0 check (final_discount >= 0);
alter table public.orders add column savings_amount numeric(12,2) generated always as (
  case when lower(status)='paid in full' and site_id <> '27457826'
    then coupon_discount + final_discount else 0::numeric end
) stored;

create table public.discount_definitions (
  id text primary key,
  name text not null,
  value numeric(12,2) not null check (value >= 0),
  value_type text not null check (value_type in ('percent','fixed')),
  stackable boolean not null default false,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.account_discounts (
  account_id uuid not null references public.reward_accounts(id) on delete cascade,
  discount_id text not null references public.discount_definitions(id) on delete cascade,
  status text not null check (status in ('available','pending','verified','rejected','expired')),
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,discount_id)
);

create trigger account_discounts_set_updated_at before update on public.account_discounts
for each row execute function public.set_updated_at();

insert into public.discount_definitions(id,name,value,value_type,stackable,description) values
 ('new-business','New business',5,'percent',false,'For businesses operating for less than two years.'),
 ('educator','Educator',5,'percent',false,'Verification required before use.'),
 ('nonprofit','Nonprofit',5,'percent',false,'Submit organization documentation to verify.'),
 ('promise-review','Promise-to-Review',15,'fixed',true,'Available on qualifying orders of $200 or more.'),
 ('cash-check','Cash/check savings',2,'percent',true,'Applied when an eligible order is paid by cash or check.');

create table public.import_staged_rows (
  id bigint generated always as identity primary key,
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  row_type text not null check (row_type in ('customer','order')),
  row_number integer not null check (row_number > 0),
  payload jsonb not null,
  validation_status text not null check (validation_status in ('valid','warning','invalid','unresolved')),
  validation_messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(import_run_id,row_type,row_number)
);
create index import_staged_rows_run_idx on public.import_staged_rows(import_run_id,row_type,validation_status);

alter table public.discount_definitions enable row level security;
alter table public.account_discounts enable row level security;
alter table public.import_staged_rows enable row level security;
create policy discount_definitions_read on public.discount_definitions for select to authenticated using(true);
create policy account_discounts_read on public.account_discounts for select to authenticated using(public.can_access_account(account_id));
create policy account_discounts_staff on public.account_discounts for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy staged_rows_staff on public.import_staged_rows for all to authenticated using(public.is_staff()) with check(public.is_staff());
grant select on public.discount_definitions,public.account_discounts to authenticated;
grant select,insert,update,delete on public.import_staged_rows to authenticated;

create or replace function public.get_my_dashboard(p_year integer default extract(year from current_date)::integer, p_account_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
 v_account_id uuid;
 v_tier_id text;
 v_tier_name text;
 v_tier_rank integer;
 v_threshold numeric;
 v_spend numeric;
 v_protected date;
 v_profile_name text;
 v_role public.app_role;
 v_result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select display_name,role into v_profile_name,v_role from public.profiles where id=auth.uid();
 if p_account_id is not null then
   if not public.can_access_account(p_account_id) then raise exception 'Account access denied'; end if;
   v_account_id:=p_account_id;
 else
   select company_id into v_account_id from public.company_memberships where profile_id=auth.uid() order by is_account_manager desc,created_at limit 1;
   if v_account_id is null then select individual_account_id into v_account_id from public.profiles where id=auth.uid(); end if;
 end if;
 if v_account_id is null then raise exception 'No rewards account is linked'; end if;

 select ct.tier_id,ct.display_name,ct.rank,ct.annual_threshold,ct.protected_through
 into v_tier_id,v_tier_name,v_tier_rank,v_threshold,v_protected
 from public.account_current_tiers ct where ct.account_id=v_account_id;
 select coalesce(annual_qualifying_spend,0) into v_spend from public.account_year_spend where account_id=v_account_id and qualifying_year=p_year;
 v_spend:=coalesce(v_spend,0);

 select jsonb_build_object(
  'profile',jsonb_build_object('firstName',split_part(v_profile_name,' ',1),'role',v_role),
  'account',jsonb_build_object('id',a.id,'displayName',a.display_name,'kind',a.kind),
  'tier',jsonb_build_object('id',coalesce(v_tier_id,'beginner'),'displayName',coalesce(v_tier_name,'Onward Beginner'),'rank',coalesce(v_tier_rank,1),'threshold',coalesce(v_threshold,0),'protectedThrough',v_protected,'currentYearSpend',v_spend),
  'summary',jsonb_build_object(
    'qualifyingOrderCount',(select count(*) from public.orders o where o.account_id=v_account_id and extract(year from o.ordered_at)=p_year and o.qualifying_spend>0),
    'savedThisYear',(select coalesce(sum(o.savings_amount),0) from public.orders o where o.account_id=v_account_id and extract(year from o.ordered_at)=p_year),
    'availableCredit',(select coalesce(sum(r.amount),0) from public.reward_ledger r where r.account_id=v_account_id and (r.expires_at is null or r.expires_at>now()))
  ),
  'benefits',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'unit',b.unit,'allowance',b.annual_allowance,'used',coalesce(u.used,0)) order by b.id)
    from public.benefit_definitions b
    left join (select benefit_id,sum(quantity) used from public.benefit_usage where account_id=v_account_id and usage_year=p_year group by benefit_id) u on u.benefit_id=b.id
    where b.active and b.tier_id=coalesce(v_tier_id,'beginner')),'[]'::jsonb),
  'discounts',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'value',d.value,'valueType',d.value_type,'stackable',d.stackable,'description',d.description,'status',ad.status) order by d.stackable,d.id)
    from public.account_discounts ad join public.discount_definitions d on d.id=ad.discount_id where ad.account_id=v_account_id and d.active and (ad.expires_at is null or ad.expires_at>now())),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(x.obj order by x.ordered_at desc) from (select o.ordered_at,jsonb_build_object('date',to_char(o.ordered_at,'Mon DD, YYYY'),'title',o.order_label,'order',o.external_order_number,'spend',o.qualifying_spend,'savings',o.savings_amount,'status',o.status) obj from public.orders o where o.account_id=v_account_id and extract(year from o.ordered_at)=p_year and o.qualifying_spend>0 order by o.ordered_at desc limit 8) x),'[]'::jsonb),
  'monthlySavings',(select jsonb_agg(jsonb_build_object('month',to_char(make_date(p_year,months.month_num,1),'Mon'),'savings',coalesce(s.amount,0)) order by months.month_num) from generate_series(1,12) as months(month_num) left join (select extract(month from ordered_at)::integer as month_num,sum(savings_amount) amount from public.orders where account_id=v_account_id and extract(year from ordered_at)=p_year group by extract(month from ordered_at)) s on s.month_num=months.month_num)
 ) into v_result from public.reward_accounts a where a.id=v_account_id;
 return v_result;
end; $$;
revoke execute on function public.get_my_dashboard(integer,uuid) from public,anon;
grant execute on function public.get_my_dashboard(integer,uuid) to authenticated;

create or replace function public.stage_deco_import(p_file_name text,p_file_sha256 text,p_customer_rows jsonb default '[]'::jsonb,p_order_rows jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_run uuid; v_existing uuid;
begin
 if not public.is_staff() then raise exception 'Staff access required'; end if;
 if jsonb_typeof(p_customer_rows)<>'array' or jsonb_typeof(p_order_rows)<>'array' then raise exception 'Rows must be JSON arrays'; end if;
 select id into v_existing from public.import_runs where file_sha256=p_file_sha256;
 if v_existing is not null then return v_existing; end if;
 insert into public.import_runs(file_name,file_sha256,status,started_at,rows_received,created_by)
 values(p_file_name,p_file_sha256,'processing',now(),jsonb_array_length(p_customer_rows)+jsonb_array_length(p_order_rows),auth.uid()) returning id into v_run;
 insert into public.import_staged_rows(import_run_id,row_type,row_number,payload,validation_status,validation_messages)
 select v_run,'customer',n,value,case when coalesce(value->>'email',value->>'id') is null then 'invalid' else 'valid' end,case when coalesce(value->>'email',value->>'id') is null then '["Customer ID or email is required"]'::jsonb else '[]'::jsonb end from jsonb_array_elements(p_customer_rows) with ordinality x(value,n);
 insert into public.import_staged_rows(import_run_id,row_type,row_number,payload,validation_status,validation_messages)
 select v_run,'order',n,value,
  case when value->>'external_order_number' is null then 'invalid' when value->>'account_id' is null then 'unresolved' else 'valid' end,
  case when value->>'external_order_number' is null then '["Order number is required"]'::jsonb when value->>'account_id' is null then '["Account attribution is unresolved"]'::jsonb else '[]'::jsonb end
 from jsonb_array_elements(p_order_rows) with ordinality x(value,n);
 update public.import_runs set status='pending',summary=(select jsonb_build_object('customers',count(*) filter(where row_type='customer'),'orders',count(*) filter(where row_type='order'),'valid',count(*) filter(where validation_status='valid'),'invalid',count(*) filter(where validation_status='invalid'),'unresolved',count(*) filter(where validation_status='unresolved')) from public.import_staged_rows where import_run_id=v_run) where id=v_run;
 insert into public.audit_events(actor_profile_id,event_type,entity_type,entity_id,details) values(auth.uid(),'import_staged','import_run',v_run::text,jsonb_build_object('file_name',p_file_name));
 return v_run;
end; $$;
revoke execute on function public.stage_deco_import(text,text,jsonb,jsonb) from public,anon;
grant execute on function public.stage_deco_import(text,text,jsonb,jsonb) to authenticated;

create or replace function public.approve_deco_import(p_import_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; v_inserted integer:=0; v_updated integer:=0;
begin
 if not public.is_staff() then raise exception 'Staff access required'; end if;
 update public.import_runs set status='processing' where id=p_import_run_id and status='pending';
 if not found then raise exception 'Import is not pending'; end if;
 for r in select payload from public.import_staged_rows where import_run_id=p_import_run_id and row_type='order' and validation_status='valid' order by row_number loop
  if exists(select 1 from public.orders where external_order_number=r.payload->>'external_order_number') then v_updated:=v_updated+1; else v_inserted:=v_inserted+1; end if;
  insert into public.orders(import_run_id,external_order_number,account_id,site_id,site_name,order_type,status,ordered_at,paid_at,amount_billed,tax_total,shipping_total,rush_order_cost,other_fee_total,coupon_discount,final_discount,order_label,raw_payload)
  values(p_import_run_id,r.payload->>'external_order_number',(r.payload->>'account_id')::uuid,coalesce(r.payload->>'site_id','22643266'),coalesce(r.payload->>'site_name','OnwardCustoms'),coalesce(r.payload->>'order_type','CSV Import'),coalesce(r.payload->>'status','Saved'),(r.payload->>'ordered_at')::timestamptz,nullif(r.payload->>'paid_at','')::timestamptz,coalesce((r.payload->>'amount_billed')::numeric,0),coalesce((r.payload->>'tax_total')::numeric,0),coalesce((r.payload->>'shipping_total')::numeric,0),coalesce((r.payload->>'rush_order_cost')::numeric,0),coalesce((r.payload->>'other_fee_total')::numeric,0),coalesce((r.payload->>'coupon_discount')::numeric,0),coalesce((r.payload->>'final_discount')::numeric,0),coalesce(r.payload->>'order_label','Onward Customs order'),r.payload)
  on conflict(external_order_number) do update set import_run_id=excluded.import_run_id,account_id=excluded.account_id,site_id=excluded.site_id,site_name=excluded.site_name,order_type=excluded.order_type,status=excluded.status,ordered_at=excluded.ordered_at,paid_at=excluded.paid_at,amount_billed=excluded.amount_billed,tax_total=excluded.tax_total,shipping_total=excluded.shipping_total,rush_order_cost=excluded.rush_order_cost,other_fee_total=excluded.other_fee_total,coupon_discount=excluded.coupon_discount,final_discount=excluded.final_discount,order_label=excluded.order_label,raw_payload=excluded.raw_payload;
 end loop;
 update public.import_runs set status='completed',completed_at=now(),rows_inserted=v_inserted,rows_updated=v_updated,rows_rejected=(select count(*) from public.import_staged_rows where import_run_id=p_import_run_id and validation_status<>'valid'),summary=summary||jsonb_build_object('inserted',v_inserted,'updated',v_updated) where id=p_import_run_id;
 insert into public.audit_events(actor_profile_id,event_type,entity_type,entity_id,details) values(auth.uid(),'import_approved','import_run',p_import_run_id::text,jsonb_build_object('inserted',v_inserted,'updated',v_updated));
 return jsonb_build_object('inserted',v_inserted,'updated',v_updated);
end; $$;
revoke execute on function public.approve_deco_import(uuid) from public,anon;
grant execute on function public.approve_deco_import(uuid) to authenticated;
