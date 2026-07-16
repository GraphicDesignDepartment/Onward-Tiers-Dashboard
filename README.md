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

Supabase currently contains anonymized proof data matching the provisional distribution of 3 Gold, 7 Silver, 44 Bronze, 248 Beginner, and 2 no-tier accounts. No names, emails, addresses, telephone numbers, or order numbers from the supplied DecoNetwork exports were imported.

Real customer import, Billing ID reconciliation, the missing January–June 2025 history, production authentication hardening, and the staff CSV upload interface remain deferred until the proof is approved.

## Deployment

Import this repository into the Onward Vercel team using Vercel's GitHub integration. Use preview deployments for review before promoting the production branch or attaching a customer-facing domain.
