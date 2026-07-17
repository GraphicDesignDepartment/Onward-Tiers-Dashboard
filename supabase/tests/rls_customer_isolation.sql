-- Run against development after at least one accepted anonymized onboarding invite.
begin;
select set_config('test.tester_id',(select auth_user_id::text from public.onboarding_invites where status='accepted' order by accepted_at desc limit 1),true);
select set_config('test.tester_account',(select account_id::text from public.onboarding_invites where status='accepted' order by accepted_at desc limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.tester_id'),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$declare own uuid:=current_setting('test.tester_account')::uuid;vin uuid:=md5('onward-demo-account-12')::uuid;payload jsonb;begin
 if public.is_staff() or not public.can_access_account(own) or public.can_access_account(vin) then raise exception 'Account access boundary failed';end if;
 if (select count(*) from public.reward_accounts)<>1 or exists(select 1 from public.orders where account_id<>own) or exists(select 1 from public.reward_ledger where account_id<>own) or exists(select 1 from public.benefit_usage where account_id<>own) then raise exception 'Customer data isolation failed';end if;
 if (select count(*) from public.profiles)<>1 or exists(select 1 from public.company_memberships where profile_id<>auth.uid()) then raise exception 'Identity isolation failed';end if;
 if exists(select 1 from public.staff_onboarding_accounts()) then raise exception 'Staff directory visible';end if;
 select public.get_my_dashboard(2026,null)into payload;if(payload->'account'->>'id')::uuid<>own then raise exception 'Dashboard account resolution failed';end if;
end$$;
rollback;
