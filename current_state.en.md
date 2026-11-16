# Quiosque do Coco - Web (Vercel) - Current State (2026-11-16)

## Builds
- `vite build` ✅ (no errors; production bundle `index-Dn8zmKH7.js`, identical to the local build)
- Vercel deploy triggered on `main` merge

## Current state
- Branch: `main` (protected), synced with `origin/main` at `585cacc` (PR #9).
- Production checks (2026-11-16): `/` → 200, `/orders` deep link → 200, API healthy.
- `npm run test:ui:mobile` (Chrome headless, 320–768 px widths + drawer) available as a manual check.

## Git Repository (web)
- Branch: `main` (protected)
- Last published commit: `585cacc fix(buscas): busca no servidor em Pedidos e tolerância a acentos nos produtos (#9)`
- Merged PRs:
  - #1: `fix: PDV fluxo de venda (pedido único e pagamento em reais)` (c5096a7)
  - #2: `chore: versiona apenas .env.example (remove .env.production)` (59aa458)
  - #4: confirm payment from `/orders` (764c5eb)
  - #5: normalizes order shift when registering payment (b71c5ef)
  - #6: tolerates orders without shift (89c4ee5)
  - #7: reports/listings per role + route guard (698ac6f)
  - #8: fixes icons overlapping input placeholders (f6dc867)
  - #9: server-side search in Orders + accent-insensitive product search (585cacc)
- `.env.production` removed from tracking; only `.env.example` versioned.
- `.gitignore` ignores `.env` and `.env.*`, releases only `.env.example`.

## Front State (PDV)
- `currentOrderId` stores the order ID after creation/submission
- `resetOrder()` clears items, payment, `currentOrderId`, resets status to `editing`
- `canSubmit` = `orderItems.length > 0 && orderStatus === 'editing' && !!selectedPayment`
- `canPay` = `orderItems.length > 0 && orderStatus === 'awaiting_payment' && !!currentOrderId`
- Cash input `min={subtotal}` (in reais, not centavos)
- `parseFloat` conversion for received value
- Back button cancels reserved order and resets state
- "Novo Pedido" button calls `resetOrder()`
- Product search uses `matchesSearch` (`src/lib/search.ts`): accent- and case-insensitive

## Front State (Shifts)
- `openShiftDetail(shift)` loads `/cash/shift/:id` and `/reports/cash/:id` together.
- Cash summary shows: initial cash, expected cash, Pix total, card total, plus debit/credit breakdown.
- Closing modal computes "Diferença projetada" from the API summary (`cashSummary.expectedCashCents`), with persisted shift values as fallback.
- Closed shifts open in read-only mode: counted cash, persisted difference, notes; the close button is hidden.
- Both dropdown actions ("Ver detalhes" and "Movimentações de caixa") open the same detail modal.
- Money inputs are in reais and go to the API as reais (`amount`/`received` are converted to cents by the backend pipe).
- PDV accepts `shift.availability[].product` as either an id (older API) or a populated object, keeping deploys safe in both orders.

## Front State (Orders)
- List is **server-side**: `/orders?status=&page=&limit=&search=`; the UI uses `data`, `total` and `totalPages` from the API.
- Search input has a 300 ms debounce; changing search, tab or page size resets to page 1.
- A `requestId` guard discards out-of-order responses (fast typing does not overwrite newer results).
- Numeric search matches the order `code`; text matches pickup name, item names and the day key (accents ignored).
- "Confirmar pagamento" in the actions dropdown loads `/payments/order/:orderId` first:
  - pending payment → `PATCH /payments/:id/confirm`;
  - already confirmed payment → idempotent `POST /orders/:id/confirm-payment`;
  - no payment (order sent without one) → opens a modal to register the payment method (cash with change, Pix reference or card debit/credit), then creates the payment and confirms it.
- `shift` is normalized (`getShiftId`/`getShiftNumber`): the API may return either the shift id (string) or the populated `{ id, number }`. The payment modal always sends a valid `shiftId`.
- Orders without a shift no longer break the list.

## Front State (Products / Stock / Reports)
- All product searches (Products, PDV) use `matchesSearch` — `"coco"` finds `"Côco"`, `"acai"` finds `"Açaí"`.
- Role guard: `/products`, `/stock` and `/reports` redirect to `/pdv` for `atendente`; management actions are hidden without permission.
- Reports page sends `?start=` / `?end=` even when empty; the API treats empty as "today" (fixed on 2026-11-16).

## Dev / Preview
- `vite.config.ts` proxies `/api` to the local API.
- HTML navigations (`Accept: text/html` or `Sec-Fetch-Mode: navigate`) are rewritten to `/index.html`, so deep links such as `/orders` return 200 in `vite dev` and `vite preview` (previously 500).

## API Integration (Front → Back)
- Base URL: `VITE_API_URL` (Vercel dashboard) or fallback `https://quiosque-api.136-248-90-172.nip.io`
- Key endpoints:
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
  - `GET /cash/shift/:shiftId` (cash movements)
  - `GET /reports/cash/:shiftId` (cash summary with Pix/card/expected/difference)
  - `GET /reports/sales/period-shift`, `/reports/sales/by-product`, `/reports/payments/by-method`, `/reports/cancellations-refunds`, `/reports/stock`
  - `POST /shifts/:id/close` (persists expected/difference)
  - `GET /audit/logs` (API only; no UI yet)
- Front uses `formatReais` to display values; backend converts `*Cents` → reais via interceptor.

## PWA
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`; registration is manual in `src/main.tsx` with a periodic updater.
- The service worker can serve a stale bundle after a deploy — a hard reload (`Ctrl+Shift+R`) forces the new build.
- Manifest: standalone, portrait, theme `#16a34a`; icons in `public/icon-192.png` and `public/icon-512.png`.

## Deploy
- Vercel: merge on `main` triggers automatic deploy.
- `vite build` compiles OK.
- Bundle contains fallback API URL when `VITE_API_URL` not set.

## Known Issues / Tech Debt
- No lint or automated tests in CI (only the manual `npm run test:ui:mobile` check).
- `npm audit` vulnerabilities (pending review).
- PDF report export: evaluated on 2026-11-16 (recommended "Print / PDF" via print CSS); **not implemented** by client decision.
