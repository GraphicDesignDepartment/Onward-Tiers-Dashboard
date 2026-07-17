-- Table grants expose rows only through the existing staff/account RLS policies.
grant select on public.reward_credit_allocations, public.benefit_usage_adjustments to authenticated;
revoke all on public.reward_credit_allocations, public.benefit_usage_adjustments from anon;
