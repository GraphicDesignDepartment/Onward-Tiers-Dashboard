# Onward Customs Tiers Dashboard

Interactive customer-facing rewards dashboard for Onward Customs.

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

## Data status

The current build uses typed representative data. Live customer authentication, DecoNetwork order synchronization, benefit redemption, verification document handling, and checkout application are intentionally deferred until the frontend is approved and the available DecoNetwork integration surface is confirmed.

## Deployment

Import this repository into the Onward Vercel team using Vercel's GitHub integration. Use preview deployments for review before promoting the production branch or attaching a customer-facing domain.
