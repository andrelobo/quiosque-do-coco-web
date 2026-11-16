# Quiosque do Coco - Web (Vercel) - Context

## Overview
React 18 + Vite 6 + React Router + PWA (`vite-plugin-pwa`) frontend for the Quiosque do Coco system, deployed on Vercel.
Pages: PDV (point-of-sale), Orders (order management), Products, Shifts, Stock, Reports.

- Current state: [`current_state.en.md`](./current_state.en.md) · README: [`README.md`](./README.md)
- API repo: `quiosque-do-coco-api`

## P0 Decisions (already merged)
- **PDV Flow**: Fixed to single-order flow (create → submit reservation → pay → confirm → deliver), instead of creating a second order on payment.
- **Currency Payload**: Changed from `amountCents`/`receivedCents` (cents as reals) to `amount`/`reais` (actual reais). API now converts via interceptor.
- **Current Order State**: Introduced `currentOrderId` to track the order across submission, payment, and confirmation steps.
- **Reset Function**: `resetOrder()` clears all state (items, payment, currentOrderId) after payment.
- **Payment Validation**: `canSubmit` requires selected payment method; `canPay` requires order ID.
- **Cash Input**: `min` attribute set to `subtotal` (not `subtotal/100`).
- **Parsing**: `parseFloat` used for received value conversion.
- **Back Button**: Now cancels the reserved order instead of just resetting state.
- **New Order Button**: Calls `resetOrder()` instead of inline state reset.

## Deploy
- Vercel: merge on `main` triggers automatic deploy.
- `vite build` compiles successfully.
- Bundle contains fallback API URL `https://quiosque-api.136-248-90-172.nip.io` when `VITE_API_URL` not set in environment.

## P1 Hardening (branch `fix/confirm-payment-e-hardening`, merged)
- **Shifts UI**: `Shifts.tsx` loads `/reports/cash/:shiftId` and shows real Pix and card totals, with debit/credit breakdown.
- **Shift detail**: both "Ver detalhes" and "Movimentações de caixa" open the same detail view; closed shifts show counted cash, persisted difference and notes, and hide the close action.
- **Closing values**: "Esperado em Dinheiro" and "Diferença projetada" use the API cash summary (falling back to the persisted shift values while loading).
- **Contract note**: currency fields keep the `*Cents` suffix in responses but carry reais (backend `CurrencyResponseInterceptor`).
- **Validation**: `vite build` passes.

## Orders payment recovery (2026-11-11)
- Orders sent to payment without a payment record can now be confirmed from `/orders`.
- The action checks `/payments/order/:orderId` and either confirms the pending payment or opens a modal to register the method (cash/change, Pix reference, card debit/credit) before confirming.
- Fixes the `Nenhum pagamento registrado para este pedido` error; the backend confirmation remains the single source of truth.

## Permissions and role guard (2026-11-15)
- `RequireRole` in `App.tsx` protects `/products`, `/stock` and `/reports`; unauthorized roles are redirected to `/pdv`.
- Management actions (edit/deactivate product, adjust stock, close shift, action columns) are hidden for roles without permission.
- Server-side: `GET /orders` and `GET /shifts` allow `atendente` (read-only). See `../acessos-por-perfil.md`.

## Search (2026-11-16)
- **Orders is server-side**: `GET /orders?status=&page=&limit=&search=` returns `data`, `total` and `totalPages`; the page keeps `page`/`limit` in state and re-fetches on change.
  - 300 ms debounce on the search input; search/tab/page-size changes reset to page 1.
  - `requestId` guard drops stale responses.
  - Numeric terms search the order `code`; text searches pickup name, item names and day key (accents ignored, regex escaped on the server).
- **Products and PDV are client-side**: `src/lib/search.ts` exposes `normalizeSearchText` and `matchesSearch`, used to filter by name/category ignoring accents and case.
- `/orders?search=(` used to return 500 from the API (`CastError` on numeric `code`); fixed server-side. The UI no longer sends search locally.

## Dev / Preview deep links (2026-11-16)
- `vite.config.ts` uses a single `apiProxy` and a `bypassHtmlNavigation` helper: requests that accept HTML (`Accept: text/html` or `Sec-Fetch-Mode: navigate`) are rewritten to `/index.html`.
- Fixes 500 errors when reloading `/orders`, `/reports`, etc. in `vite dev` and `vite preview`.
- Production SPA fallback is handled by `vercel.json`.

## PWA
- `registerType: 'autoUpdate'`; registration is manual in `src/main.tsx` with a periodic updater.
- After a deploy, a stale bundle can be served by the service worker; a hard reload (`Ctrl+Shift+R`) or bypassing the SW in DevTools forces the new build.

## Repository Git (web)
- Branch: `main` (protected), last commit `585cacc` (PR #9).
- Merged PRs: #1 PDV flow, #2 env files, #4 confirm payment from Orders, #5 shift normalization, #6 orders without shift, #7 roles/route guard, #8 input icon padding, #9 server-side search + accent-insensitive products.
- `.env.production` removed from tracking; only `.env.example` versioned.
- `.gitignore` ignores `.env` and `.env.*`, releases only `.env.example`.

## API Integration (Front → Back)
- Base URL: `VITE_API_URL` (Vercel dashboard) or fallback `https://quiosque-api.136-248-90-172.nip.io`
- Endpoints used:
  - `GET /shifts/current`
  - `GET /shifts/:id/products`
  - `GET /products?includeInactive=false`
  - `GET /orders?status=&page=&limit=&search=`
  - `POST /orders` (create order)
  - `POST /orders/:id/submit` (reserve stock)
  - `POST /payments` (payment with `amount`/`reais`)
  - `GET /payments/order/:orderId` (list payments for order)
  - `PATCH /payments/:id/confirm` (confirm payment)
  - `POST /orders/:id/cancel` (cancel order)
  - `GET /cash/shift/:shiftId` and `/reports/cash/:shiftId`
  - `GET /reports/sales/period-shift`, `/reports/sales/by-product`, `/reports/payments/by-method`
  - `GET /reports/cancellations-refunds`, `/reports/orders/pending-delivery`, `/reports/stock`
- Front uses `formatReais` to display values; backend converts `*Cents` → reais via interceptor.
- Reports accept `?start=&end=` in `YYYY-MM-DD`; empty values mean "today" (business timezone). Invalid/reversed dates return 400.

## Modified Files (main areas)
- `web/src/pages/PDV.tsx` — sale state machine, payloads, validation, product search.
- `web/src/pages/Orders.tsx` — server-side list/search/pagination.
- `web/src/pages/Products.tsx` — accent-insensitive search.
- `web/src/pages/Reports.tsx` — report tabs and date filters.
- `web/src/lib/search.ts` — `normalizeSearchText`/`matchesSearch`.
- `web/vite.config.ts` — API proxy + HTML navigation bypass.
- `web/src/App.tsx` — `RequireRole` guard.

## P1 Pending (outside P0)
- Automated tests in CI (only `npm run test:ui:mobile` manual; no lint in CI).
- Audit UI page (endpoint exists on the API).
- Screens for refunds, cash reinforcement/withdrawal and payment rejection (API only).
- PDF report export: evaluated on 2026-11-16 (recommended print CSS); not implemented by client decision.

## Known Issues / Tech Debt
- No automated tests/lint in CI.
- `npm audit` vulnerabilities (pending review).
- PWA may serve a stale bundle until a hard reload.
