export type TierId = "beginner" | "bronze" | "silver" | "gold" | "platinum";

export type Tier = {
  id: TierId;
  name: string;
  shortName: string;
  threshold: number;
  discount: number;
  accent: string;
  description: string;
  benefits: string[];
};

export const tiers: Tier[] = [
  {
    id: "beginner",
    name: "Onward Beginner",
    shortName: "Beginner",
    threshold: 0,
    discount: 0,
    accent: "#E6E6E6",
    description: "Your first step into Onward rewards.",
    benefits: [
      "1 free artwork hour per calendar year",
      "5% off your first order",
      "Free logo storage",
      "25% off webstore creation fees",
      "Webstore pricing at the 12-item price break",
      "Customer-provided garments accepted, subject to terms",
    ],
  },
  {
    id: "bronze",
    name: "Onward Plus — Bronze",
    shortName: "Bronze",
    threshold: 500,
    discount: 0,
    accent: "#B7793D",
    description: "More creative support and stronger webstore pricing.",
    benefits: [
      "2 total free artwork hours per calendar year",
      "Unlimited simple logo edits and file conversions",
      "15% deposit, then net-30 eligibility",
      "10% off rush-order fees",
      "50% off webstore creation fees",
      "Webstore pricing at the 24-item price break",
      "Eligible fundraiser listings",
    ],
  },
  {
    id: "silver",
    name: "Onward Preferred — Silver",
    shortName: "Silver",
    threshold: 2500,
    discount: 5,
    accent: "#A7AFB8",
    description: "Premium terms, savings and hands-on brand support.",
    benefits: [
      "6 total free artwork hours per calendar year",
      "0% deposit, then net-30 eligibility",
      "25% off rush-order fees",
      "75% off webstore creation fees",
      "Webstore pricing at the 48-item price break",
      "5% non-stackable discount on eligible orders",
      "1 Shopify fulfillment integration per calendar year",
      "1 site visit and 1 garment sample per calendar year",
    ],
  },
  {
    id: "gold",
    name: "Onward Corporate — Gold",
    shortName: "Gold",
    threshold: 5000,
    discount: 10,
    accent: "#FFC500",
    description: "Corporate-level service, savings and account support.",
    benefits: [
      "12 total free artwork hours per calendar year",
      "50% off rush-order fees",
      "Free webstore creation",
      "Webstore pricing at the 75-item price break",
      "10% non-stackable discount on eligible non-webstore orders",
      "2 site visits per calendar year",
      "2 garment samples per calendar year",
    ],
  },
  {
    id: "platinum",
    name: "Onward Industrial — Platinum",
    shortName: "Platinum",
    threshold: 15000,
    discount: 10,
    accent: "#57E1D9",
    description: "Our highest industrial partnership tier.",
    benefits: [
      "Everything included with Gold",
      "24 total free artwork hours per calendar year",
      "75% off rush-order fees",
      "4 site visits per calendar year",
      "4 garment samples per calendar year",
      "10% off webstore listings",
    ],
  },
];

export const benefits = [
  {
    id: "artwork",
    category: "Artwork & files",
    title: "Artwork hours",
    detail: "Hands-on artwork support from the Onward creative team.",
    used: 0.5,
    total: 2,
    unit: "hours",
    action: "Request artwork help",
    icon: "palette",
  },
  {
    id: "edits",
    category: "Artwork & files",
    title: "Simple logo edits",
    detail: "Quick logo adjustments and design-file conversions under five minutes.",
    used: 4,
    total: null,
    unit: "used this year",
    action: "Submit an edit",
    icon: "wand",
  },
  {
    id: "rush",
    category: "Order savings",
    title: "Rush-order savings",
    detail: "Your Bronze tier reduces eligible rush-order fees by 10%.",
    used: 10,
    total: 100,
    unit: "% off",
    action: "View rush terms",
    icon: "zap",
  },
  {
    id: "webstore",
    category: "Webstores",
    title: "Webstore creation",
    detail: "Launch a custom store with 50% off setup and 24-item-break pricing.",
    used: 50,
    total: 100,
    unit: "% off",
    action: "Start a webstore",
    icon: "store",
  },
  {
    id: "terms",
    category: "Payment terms",
    title: "Flexible payment terms",
    detail: "Eligible accounts can use a 15% deposit followed by net-30 terms.",
    used: 0,
    total: null,
    unit: "available",
    action: "Check eligibility",
    icon: "calendar",
  },
  {
    id: "garments",
    category: "Production",
    title: "Your own garments",
    detail: "Bring customer-supplied garments for decoration, subject to the garment waiver.",
    used: 0,
    total: null,
    unit: "available",
    action: "Review requirements",
    icon: "shirt",
  },
];

export const nonStackableDiscounts = [
  {
    id: "new-business",
    name: "New business",
    value: 5,
    status: "verified",
    description: "For businesses operating for less than two years.",
  },
  {
    id: "educator",
    name: "Educator",
    value: 5,
    status: "available",
    description: "Verification required before use.",
  },
  {
    id: "nonprofit",
    name: "Nonprofit",
    value: 5,
    status: "available",
    description: "Submit organization documentation to verify.",
  },
];

export const stackableOffers = [
  {
    id: "review",
    name: "Promise-to-Review",
    value: "$15",
    description: "Available on qualifying orders of $200 or more.",
  },
  {
    id: "cash",
    name: "Cash/check savings",
    value: "2%",
    description: "Applied when an eligible order is paid by cash or check.",
  },
  {
    id: "referral",
    name: "Referral credit",
    value: "$50",
    description: "Current available account credit from completed referrals.",
  },
];

export const activity = [
  { date: "Jul 08, 2026", title: "Summer staff polos", order: "OC-1842", spend: 612, savings: 31, status: "Completed" },
  { date: "May 21, 2026", title: "Event volunteer tees", order: "OC-1769", spend: 438, savings: 15, status: "Completed" },
  { date: "Mar 14, 2026", title: "Logo refresh & jackets", order: "OC-1658", spend: 324, savings: 0, status: "Completed" },
  { date: "Jan 30, 2026", title: "New-hire apparel", order: "OC-1591", spend: 266, savings: 13, status: "Completed" },
];

export const savingsData = [
  { month: "Jan", savings: 13 },
  { month: "Feb", savings: 0 },
  { month: "Mar", savings: 18 },
  { month: "Apr", savings: 0 },
  { month: "May", savings: 42 },
  { month: "Jun", savings: 20 },
  { month: "Jul", savings: 66 },
];

export const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
