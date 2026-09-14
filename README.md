# Premium Bakery Website Platform

A reusable, mobile-first premium bakery/cake/sweets storefront with an optional Supabase CMS foundation. The first demo business is **Black Forest Bakery & Sweets — Ghora Sahan, Bihar, India**. Business-specific values are centralized and demo content is explicitly marked.

## Current status

The repository started empty. The customer storefront, responsive design system, local cart, checkout enquiry flow, custom-cake studio, gallery, route structure, optional Supabase client, schema/RLS foundation and admin shell are implemented. Live persistence for public order/custom-cake writes is intentionally not enabled until the Supabase server-side write path is configured.

## Stack

React + TypeScript + Vite · React Router · Supabase JS/PostgreSQL/Auth foundation · CSS design system · Vitest-ready tests · Vercel-compatible build.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The GitHub integration used for this repository cannot execute shell commands, so these commands must be run in a local/CI environment before production deployment. No test result is claimed without execution.

## Environment

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are optional for the demo storefront but required for live CMS/Auth. `VITE_SITE_URL` is the deployed origin. `VITE_ANALYTICS_ID` is optional.

Never put a Supabase service-role key in a `VITE_` variable or browser code. Never commit `.env`.

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/202609140001_initial.sql`.
3. Create an Auth user through Supabase Auth; never seed passwords into tables.
4. Securely create that user's `profiles` row with role `owner`, `admin`, `manager`, or `staff`.
5. Create Storage buckets for `products`, `gallery`, `categories`, `branding`, and a private `custom-cakes` bucket, then apply storage RLS.
6. Configure verified business data and content.

RLS protects orders, customer information, custom cake requests and audit logs. Public reads are limited to catalogue content intended for public display.

## Rebranding / new client

1. Replace the demo business settings with verified business data.
2. Upload the real logo/favicon.
3. Add verified categories and products.
4. Add verified product images and alt text.
5. Configure the verified WhatsApp number.
6. Configure the verified Maps directions URL.
7. Configure actual opening hours and holiday exceptions.
8. Configure SEO title/description/OG image.
9. Replace sample reviews with verified reviews.
10. Deploy and test all customer/admin flows.

The centralized business configuration changes brand name, tagline, contact/location presentation, hours, ordering settings and SEO-facing content without scattering the business name through components.

## WhatsApp / Maps / Analytics

WhatsApp uses URL encoding and only appears when a verified number is configured. A click is never treated as an order confirmation. Maps can use a directions URL without an SDK/API key. Analytics is optional and should be enabled only after a privacy review.

## Payment

No live payment collection is implemented. `payment_enabled` defaults to false. Add payment only through a server-side integration with secrets kept off the client.

## Security

Supabase Auth owns passwords; RLS protects private records; customer data is not publicly readable; product/order snapshots preserve historical values; client-side totals are presentation values and production persisted orders must be recalculated server-side; customer uploads should use a private bucket and signed URLs.

## Project layout

```text
src/
  config/       reusable business configuration
  data/         editable demo catalogue
  lib/          Supabase client
  pages/admin/  admin login/CMS shell
  App.tsx       routes and storefront
  styles.css    responsive design system
supabase/
  migrations/   PostgreSQL + RLS schema
.env.example
CLIENT_CUSTOMIZATION.md
```

## Deployment

Run `npm run build` and deploy `dist/` to Vercel. Set environment variables in Vercel and configure SPA rewrites for deep links.
