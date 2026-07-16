# Onward Customs Tiers Dashboard

Interactive customer-facing rewards dashboard for Onward Customs.

## Live preview

- [GitHub Pages dashboard](https://graphicdesigndepartment.github.io/Onward-Tiers-Dashboard/)

The GitHub Pages deployment is the temporary public preview while Vercel resolves a team-level `live: false` routing state that causes otherwise-ready Vercel deployments to return edge-level `NOT_FOUND` responses.

## Features

- Beginner, Bronze, Silver, and Gold progress tracking
- Separate Reseller/Decorator qualification path
- Benefit usage wallet
- Mutually exclusive non-stackable discount selection
- Stackable savings and referral credit display
- Qualifying order activity and savings chart
- Responsive desktop and mobile UI
- Onward Customs brand colors and typography

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

## Supabase development foundation

The development database schema is versioned under [`supabase/migrations`](supabase/migrations):

- Customer and company reward accounts
- Paid-in-full order eligibility
- Onward Blanks exclusion
- Tax, shipping, rush-fee, and other-fee deductions
- Calendar-year tier calculations and protected-through dates
- Immutable reward and benefit ledgers
- Reseller/Decorator verification workflow
- Import and audit history
- Row Level Security for customer, company, and staff access

Copy `.env.example` to `.env.local` to enable authenticated development reads:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Only the publishable key belongs in browser configuration. Never place `sb_secret_*`, legacy `service_role`, database passwords, customer exports, or production PII in source control.

When the variables are absent, the app intentionally falls back to representative demo data so the static GitHub Pages preview continues to work. Configured development builds present a passwordless email magic-link sign-in screen and load only the individual or company account allowed by Row Level Security.

## Data status

Supabase currently contains anonymized proof data matching the provisional distribution of 3 Gold, 7 Silver, 44 Bronze, 248 Beginner, and 2 no-tier accounts. Vincent’s development profile is linked to a fictional Bronze company with four qualifying orders, $750 annual spend, benefit usage, discounts, savings, and ledger credit. No names, addresses, telephone numbers, or order numbers from the supplied DecoNetwork exports were imported.

Authenticated customer views now load tier, spend, protection, summary cards, benefits, discounts, monthly savings, credits, and recent activity from the `get_my_dashboard` RPC.

## CSV Import Center

Development admins can open `/admin/import` to select customer and order CSV files, validate headers and rows locally, calculate paid/Onward-Blanks counts, hash the source, and create a staff-protected dry-run staging record. Staging and approval functions enforce the staff role in PostgreSQL and use idempotent order upserts.

Do not upload real customer exports during proof testing. Real import approval, Billing ID reconciliation, the missing January–June 2025 history, and production authentication hardening remain deferred.

## Deployment

Import this repository into the Onward Vercel team using Vercel's GitHub integration. Use preview deployments for review before promoting the production branch or attaching a customer-facing domain.
