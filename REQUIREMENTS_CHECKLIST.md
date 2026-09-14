# Premium Bakery Website — Requirements Checklist

Status legend: NOT STARTED / IN PROGRESS / IMPLEMENTED / VERIFIED / BLOCKED

| Area | Status | Notes |
|---|---|---|
| React + Vite + TypeScript foundation | IMPLEMENTED | Customer and admin routes are present |
| Central business configuration | IMPLEMENTED | Demo business data is isolated in `src/config/business.ts` |
| Mobile-first premium storefront | IMPLEMENTED | Responsive layout, navigation and mobile action bar |
| Menu, categories, product detail | IMPLEMENTED | Demo catalogue with variants and cart |
| Cart persistence | IMPLEMENTED | LocalStorage contains cart-only non-sensitive state |
| Checkout validation | IMPLEMENTED | Indian mobile, delivery/pickup and scheduling validation |
| WhatsApp order flow | IMPLEMENTED | Uses configured number only and asks bakery to confirm |
| Server-side authoritative order pricing | IMPLEMENTED | Supabase RPC validates catalogue prices |
| Server-side offers + minimum order | IMPLEMENTED | Migration `202609140004...` |
| Custom cake request persistence | IMPLEMENTED | Supabase RPC added; reference-image handling remains deployment-configured |
| Supabase schema + RLS | IMPLEMENTED | Private customer/admin data protected by policies |
| Supabase Auth + roles | IMPLEMENTED | Owner/admin/manager/staff gate |
| Admin dashboard routes | IMPLEMENTED | Dashboard and management areas are scaffolded |
| Admin CRUD persistence | IN PROGRESS | Some admin areas still show demo/readiness states |
| Gallery/lightbox management | IN PROGRESS | Storage schema/policies are ready |
| Dynamic DB-driven storefront content | IN PROGRESS | Demo fallback currently remains primary when Supabase is unconfigured |
| SEO metadata + structured data | IN PROGRESS | robots/sitemap present; route-level metadata needs final pass |
| Accessibility final audit | IN PROGRESS | Semantic controls and labels present; dialog/focus audit remains |
| Performance final audit | IN PROGRESS | Lazy imagery and lean dependencies; Lighthouse-style verification remains |
| Analytics | NOT STARTED | Optional; no hardcoded tracking ID |
| Payments | BLOCKED | Disabled by default until real provider credentials are configured |
| Real business contact/ordering details | BLOCKED | Must be supplied/verified by client; current demo config intentionally contains blanks |
| CI lint/typecheck/tests/build | IN PROGRESS | Lint/typecheck/tests pass; build fixes are being verified |
| Local hosting | NOT STARTED | Intentionally deferred per user request |
