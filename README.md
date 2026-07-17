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

When the variables are absent, the app intentionally falls back to representative demo data. Configured deployments use persistent email/password authentication and load only the individual or company account allowed by Row Level Security. Password setup and recovery use Supabase’s verified recovery-email flow; public self-registration remains disabled.

## Data status

Supabase currently contains anonymized proof data matching the provisional distribution of 3 Gold, 7 Silver, 44 Bronze, 248 Beginner, and 2 no-tier accounts. Vincent’s development profile is linked to a fictional Bronze company with four qualifying orders, $750 annual spend, benefit usage, discounts, savings, and ledger credit. No names, addresses, telephone numbers, or order numbers from the supplied DecoNetwork exports were imported.

Authenticated customer views now load tier, spend, protection, summary cards, benefits, discounts, monthly savings, credits, and recent activity from the `get_my_dashboard` RPC.

## Staff administration

Customer-facing navigation contains no staff controls. Development staff open `/admin` directly to review persisted Reseller/Decorator applications or continue to `/admin/import` for CSV tools. Both routes enforce staff/admin access through Supabase roles and RLS.

The CSV Import Center validates headers and rows locally, calculates paid/Onward-Blanks counts, hashes the source, and creates a staff-protected dry-run staging record. Staging and approval functions enforce the staff role in PostgreSQL and use idempotent order upserts.

Do not upload real customer exports during proof testing. Real import approval, Billing ID reconciliation, the missing January–June 2025 history, and production authentication hardening remain deferred.

## Authenticated GitHub Pages testing

The Pages workflow requires these GitHub repository settings:

- **Variable:** `NEXT_PUBLIC_SUPABASE_URL`
- **Secret:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Configure them under **Settings → Secrets and variables → Actions**. The deployment fails intentionally if either value is missing, preventing an accidental demo-only public build.

Configure the development Supabase Auth URLs as:

- Site URL: `https://graphicdesigndepartment.github.io/Onward-Tiers-Dashboard/`
- Redirect URL: `https://graphicdesigndepartment.github.io/Onward-Tiers-Dashboard/**`
- Local redirect: `http://localhost:3000/**`

Every tester must exist in Supabase Auth and be linked to an anonymized `reward_accounts` record through a profile or company membership. New testers use **Forgot password** once to choose their password, then sign in normally and remain signed in until explicitly logging out. Signed-in but unlinked testers receive an account-setup screen and never see representative customer data.

## Deployment

GitHub Pages is the authenticated development-testing environment. Production remains deferred until a secure production Supabase project and Vercel/Cloudflare hosting are approved.
