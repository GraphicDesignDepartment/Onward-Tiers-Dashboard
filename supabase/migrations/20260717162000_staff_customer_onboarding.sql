create type public.onboarding_status as enum('invited','accepted','disabled','failed');
create type public.account_relationship as enum('individual','company_member','company_manager');
alter table public.profiles drop constraint if exists profiles_individual_account_kind;
create table public.onboarding_invites(
 id uuid primary key default gen_random_uuid(),auth_user_id uuid not null unique references auth.users(id) on delete cascade,
 account_id uuid not null references public.reward_accounts(id) on delete restrict,
 relationship public.account_relationship not null,status public.onboarding_status not null default'invited',
 invited_by uuid not null references public.profiles(id),invited_at timestamptz not null default now(),last_invited_at timestamptz not null default now(),accepted_at timestamptz,disabled_at timestamptz,failure_code text,
 unique(auth_user_id,account_id)
);
alter table public.onboarding_invites enable row level security;
create policy onboarding_staff_all on public.onboarding_invites for all to authenticated using(public.is_staff()) with check(public.is_staff());
grant select,insert,update on public.onboarding_invites to authenticated;
create or replace function public.staff_onboarding_accounts() returns table(id uuid,display_name text,kind public.account_kind,active boolean,current_tier text) language sql stable security definer set search_path=public as $$
 select a.id,a.display_name,a.kind,a.active,coalesce(t.display_name,'Onward Beginner') from public.reward_accounts a left join public.account_current_tiers t on t.account_id=a.id where public.is_staff() order by a.display_name;
$$;
revoke execute on function public.staff_onboarding_accounts() from public,anon;grant execute on function public.staff_onboarding_accounts() to authenticated;
create or replace function public.mark_my_onboarding_accepted() returns void language plpgsql security definer set search_path=public as $$begin
 update public.onboarding_invites set status='accepted',accepted_at=coalesce(accepted_at,now()) where auth_user_id=auth.uid() and status='invited';
end;$$;
revoke execute on function public.mark_my_onboarding_accepted() from public,anon;grant execute on function public.mark_my_onboarding_accepted() to authenticated;
revoke all on public.onboarding_invites from anon;
