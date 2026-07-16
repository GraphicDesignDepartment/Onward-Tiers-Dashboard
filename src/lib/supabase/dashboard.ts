import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activity as demoActivity,
  benefits as demoBenefits,
  nonStackableDiscounts as demoDiscounts,
  savingsData as demoSavings,
  stackableOffers as demoStackableOffers,
  type TierId,
} from "@/lib/tier-data";

type Benefit = (typeof demoBenefits)[number];
type Discount = (typeof demoDiscounts)[number];
type StackableOffer = (typeof demoStackableOffers)[number];
type Activity = (typeof demoActivity)[number];
type SavingsPoint = (typeof demoSavings)[number];
type RpcBenefit = { id: string; name: string; unit: string; allowance: number | string | null; used: number | string | null };
type RpcDiscount = { id: string; name: string; value: number | string; valueType: "fixed" | "percent"; stackable: boolean; description: string; status: string };
type RpcActivity = { date: string; title: string; order: string; spend: number | string; savings: number | string; status: string };
type RpcSavings = { month: string; savings: number | string };
type RpcPayload = {
  profile: { firstName: string; role: "customer" | "staff" | "admin" };
  account: { id: string; displayName: string; kind: "individual" | "company" };
  tier: { id: TierId; protectedThrough: string | null; currentYearSpend: number | string };
  summary: { qualifyingOrderCount: number | string; savedThisYear: number | string; availableCredit: number | string };
  benefits: RpcBenefit[];
  discounts: RpcDiscount[];
  activity: RpcActivity[];
  monthlySavings: RpcSavings[];
};

export type DashboardSnapshot = {
  accountId: string | null;
  displayName: string;
  firstName: string;
  role: "customer" | "staff" | "admin";
  currentTierId: TierId;
  currentYearSpend: number;
  protectedThrough: string;
  qualifyingOrderCount: number;
  savedThisYear: number;
  availableCredit: number;
  benefits: Benefit[];
  nonStackableDiscounts: Discount[];
  stackableOffers: StackableOffer[];
  activity: Activity[];
  savingsData: SavingsPoint[];
  source: "demo" | "supabase";
};

export const demoDashboardSnapshot: DashboardSnapshot = {
  accountId: null,
  displayName: "Kelvin Studios",
  firstName: "Kelvin",
  role: "customer",
  currentTierId: "bronze",
  currentYearSpend: 1640,
  protectedThrough: "December 31, 2027",
  qualifyingOrderCount: 4,
  savedThisYear: 159,
  availableCredit: 50,
  benefits: demoBenefits,
  nonStackableDiscounts: demoDiscounts,
  stackableOffers: demoStackableOffers,
  activity: demoActivity,
  savingsData: demoSavings,
  source: "demo",
};

const benefitPresentation: Record<string, Pick<Benefit, "category" | "detail" | "action" | "icon">> = {
  bronze_artwork_hours: { category: "Artwork & files", detail: "Hands-on artwork support from the Onward creative team.", action: "Request artwork help", icon: "palette" },
  bronze_logo_edits: { category: "Artwork & files", detail: "Quick logo adjustments and design-file conversions under five minutes.", action: "Submit an edit", icon: "wand" },
  bronze_rush_savings: { category: "Order savings", detail: "Your Bronze tier reduces eligible rush-order fees by 10%.", action: "View rush terms", icon: "zap" },
  bronze_webstore: { category: "Webstores", detail: "Launch a custom store with 50% off setup and 24-item-break pricing.", action: "Start a webstore", icon: "store" },
  bronze_payment_terms: { category: "Payment terms", detail: "Eligible accounts can use a 15% deposit followed by net-30 terms.", action: "Check eligibility", icon: "calendar" },
  bronze_customer_garments: { category: "Production", detail: "Bring customer-supplied garments for decoration, subject to the garment waiver.", action: "Review requirements", icon: "shirt" },
};

function formatProtectionDate(value: string | null): string {
  if (!value) return "the end of next year";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export async function loadAuthenticatedDashboard(supabase: SupabaseClient): Promise<DashboardSnapshot | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase.rpc("get_my_dashboard", {
    p_year: new Date().getFullYear(),
  });
  if (error || !data) {
    console.error("Unable to load rewards dashboard", error?.message);
    return null;
  }

  const payload = data as unknown as RpcPayload;
  const benefitRows = Array.isArray(payload.benefits) ? payload.benefits : [];
  const discountRows = Array.isArray(payload.discounts) ? payload.discounts : [];

  const benefits: Benefit[] = benefitRows.map((row: RpcBenefit) => {
    const presentation = benefitPresentation[row.id] ?? {
      category: "Tier benefit",
      detail: `${row.name} is included with this account tier.`,
      action: "Contact support",
      icon: "store",
    };
    return {
      id: row.id,
      title: row.name,
      used: Number(row.used ?? 0),
      total: row.allowance === null ? null : Number(row.allowance),
      unit: row.unit,
      ...presentation,
    };
  });

  const nonStackableDiscounts: Discount[] = discountRows
    .filter((row: RpcDiscount) => !row.stackable)
    .map((row: RpcDiscount) => ({ id: row.id, name: row.name, value: Number(row.value), status: row.status, description: row.description }));

  const stackableOffers: StackableOffer[] = discountRows
    .filter((row: RpcDiscount) => row.stackable)
    .map((row: RpcDiscount) => ({
      id: row.id,
      name: row.name,
      value: row.valueType === "fixed" ? `$${Number(row.value)}` : `${Number(row.value)}%`,
      description: row.description,
    }));
  const availableCredit = Number(payload.summary.availableCredit ?? 0);
  if (availableCredit > 0) {
    stackableOffers.push({
      id: "referral",
      name: "Referral credit",
      value: `$${availableCredit}`,
      description: "Available unexpired credit from completed referrals and adjustments.",
    });
  }

  return {
    accountId: payload.account.id,
    displayName: payload.account.displayName,
    firstName: payload.profile.firstName,
    role: payload.profile.role,
    currentTierId: payload.tier.id as TierId,
    currentYearSpend: Number(payload.tier.currentYearSpend ?? 0),
    protectedThrough: formatProtectionDate(payload.tier.protectedThrough ?? null),
    qualifyingOrderCount: Number(payload.summary.qualifyingOrderCount ?? 0),
    savedThisYear: Number(payload.summary.savedThisYear ?? 0),
    availableCredit,
    benefits,
    nonStackableDiscounts,
    stackableOffers,
    activity: (payload.activity ?? []).map((row: RpcActivity) => ({ ...row, spend: Number(row.spend), savings: Number(row.savings) })),
    savingsData: (payload.monthlySavings ?? []).map((row: RpcSavings) => ({ month: row.month, savings: Number(row.savings) })),
    source: "supabase",
  };
}
