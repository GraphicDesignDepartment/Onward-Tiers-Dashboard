import type { SupabaseClient } from "@supabase/supabase-js";
import type { TierId } from "@/lib/tier-data";

export type DashboardSnapshot = {
  accountId: string | null;
  displayName: string;
  firstName: string;
  currentTierId: TierId;
  currentYearSpend: number;
  protectedThrough: string;
  source: "demo" | "supabase";
};

export const demoDashboardSnapshot: DashboardSnapshot = {
  accountId: null,
  displayName: "Kelvin Studios",
  firstName: "Kelvin",
  currentTierId: "bronze",
  currentYearSpend: 1640,
  protectedThrough: "December 31, 2027",
  source: "demo",
};

function formatProtectionDate(value: string | null): string {
  if (!value) return "the end of next year";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export async function loadAuthenticatedDashboard(
  supabase: SupabaseClient,
): Promise<DashboardSnapshot | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, individual_account_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  let accountId = profile.individual_account_id as string | null;
  if (!accountId) {
    const { data: membership } = await supabase
      .from("company_memberships")
      .select("company_id")
      .eq("profile_id", authData.user.id)
      .limit(1)
      .maybeSingle();
    accountId = (membership?.company_id as string | undefined) ?? null;
  }
  if (!accountId) return null;

  const currentYear = new Date().getFullYear();
  const [accountResult, tierResult, spendResult] = await Promise.all([
    supabase.from("reward_accounts").select("display_name").eq("id", accountId).single(),
    supabase
      .from("account_current_tiers")
      .select("tier_id, protected_through")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("account_year_spend")
      .select("annual_qualifying_spend")
      .eq("account_id", accountId)
      .eq("qualifying_year", currentYear)
      .maybeSingle(),
  ]);

  if (accountResult.error) return null;

  const displayName = String(accountResult.data.display_name);
  const tierId = (tierResult.data?.tier_id ?? "beginner") as TierId;

  return {
    accountId,
    displayName,
    firstName: profile.display_name.split(/\s+/)[0] || "Customer",
    currentTierId: tierId,
    currentYearSpend: Number(spendResult.data?.annual_qualifying_spend ?? 0),
    protectedThrough: formatProtectionDate(tierResult.data?.protected_through ?? null),
    source: "supabase",
  };
}
