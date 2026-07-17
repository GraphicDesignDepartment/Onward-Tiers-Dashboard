alter table public.reward_accounts add column if not exists onboarding_enabled boolean not null default false;
alter table public.reward_accounts add column if not exists onboarding_label text;
with candidates as(
 select distinct on(ct.tier_id) a.id,ct.tier_id from public.account_current_tiers ct join public.reward_accounts a on a.id=ct.account_id
 left join public.profiles p on p.individual_account_id=a.id left join public.company_memberships m on m.company_id=a.id
 where ct.tier_id in('beginner','bronze','silver','gold') and p.id is null and m.profile_id is null
 order by ct.tier_id,(case when ct.tier_id='beginner' and a.kind='individual' then 0 else 1 end),a.id
)update public.reward_accounts a set onboarding_enabled=true,onboarding_label='Test Account — '||initcap(c.tier_id)||case when a.kind='company' then ' Company' else ' Individual' end from candidates c where a.id=c.id;
insert into public.reward_accounts(id,kind,display_name,normalized_key,onboarding_enabled,onboarding_label)values(md5('onward-curated-platinum')::uuid,'company','Test Platinum Company','curated-test-platinum',true,'Test Account — Platinum Company')on conflict(id)do update set onboarding_enabled=true,onboarding_label=excluded.onboarding_label;
insert into public.companies(id,legal_name,normalized_name)values(md5('onward-curated-platinum')::uuid,'Test Platinum Company','test platinum company')on conflict(id)do nothing;
insert into public.orders(id,external_order_number,account_id,site_id,site_name,order_type,status,ordered_at,paid_at,amount_billed,raw_payload)values(md5('onward-curated-platinum-order')::uuid,'TEST-PLATINUM-001',md5('onward-curated-platinum')::uuid,'onward-customs','Onward Customs','test fixture','Paid in full','2026-06-15 12:00:00-04','2026-06-15 12:00:00-04',15000,'{"fixture":"curated onboarding"}')on conflict(external_order_number)do nothing;
select public.rebuild_tier_achievements(md5('onward-curated-platinum')::uuid);
create or replace function public.staff_onboarding_accounts()returns table(id uuid,display_name text,kind public.account_kind,active boolean,current_tier text)language sql stable security definer set search_path=public as $$select a.id,coalesce(a.onboarding_label,a.display_name),a.kind,a.active,coalesce(t.display_name,'Onward Beginner')from public.reward_accounts a left join public.account_current_tiers t on t.account_id=a.id where public.is_staff()and a.onboarding_enabled order by t.rank,a.onboarding_label;$$;
revoke execute on function public.staff_onboarding_accounts()from public,anon;grant execute on function public.staff_onboarding_accounts()to authenticated;
