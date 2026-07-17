-- Self-contained rollback-only authenticated customer isolation proof.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)values(md5('rls-local-user')::uuid,'authenticated','authenticated','rls-fixture@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now())on conflict(id)do nothing;
insert into public.reward_accounts(id,kind,display_name,normalized_key)values(md5('rls-local-account')::uuid,'individual','RLS Test Account','rls-test-account')on conflict(id)do nothing;
insert into public.profiles(id,individual_account_id,display_name,role)values(md5('rls-local-user')::uuid,md5('rls-local-account')::uuid,'RLS Test User','customer')on conflict(id)do update set individual_account_id=excluded.individual_account_id,role='customer';
select set_config('test.tester_id',md5('rls-local-user')::uuid::text,true);
select set_config('test.tester_account',md5('rls-local-account')::uuid::text,true);
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
