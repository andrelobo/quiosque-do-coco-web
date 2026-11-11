# Quiosque do Coco - Web (Vercel) - Current State (11/11/2026)

## Builds
- `vite build` ✅ (no errors, produces dist bundle)
- Vercel deploy triggered on `main` merge

## Work in progress
- Branch in the server repo: `fix/confirm-payment-e-hardening` (web changes are local).
- Shifts page updated to consume the new cash summary contract.

## Git Repository (web)
- Branch: `main` (protected)
- Last published commit: `59aa458 chore: versiona apenas .env.example (remove .env.production)` + `c5096a7 feat: frontend usa Reais (R$) em vez de centavos`
- Merged PRs:
  - #1: `fix: PDV fluxo de venda (pedido único e pagamento em reais)` (c5096a7)
  - #2: `chore: versiona apenas .env.example (remove .env.production)` (59aa458)
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

## Front State (Shifts)
- `openShiftDetail(shift)` loads `/cash/shift/:id` and `/reports/cash/:id` together.
- Cash summary shows: initial cash, expected cash, Pix total, card total, plus debit/credit breakdown.
- Closing modal computes "Diferença projetada" from the API summary (`cashSummary.expectedCashCents`), with persisted shift values as fallback.
- Closed shifts open in read-only mode: counted cash, persisted difference, notes; the close button is hidden.
- Both dropdown actions ("Ver detalhes" and "Movimentações de caixa") open the same detail modal.
- Money inputs are in reais and go to the API as reais (`amount`/`received` are converted to cents by the backend pipe).
- PDV accepts `shift.availability[].product` as either an id (older API) or a populated object (API PR #4), keeping deploys safe in both orders.

## Front State (Orders)
- "Confirmar pagamento" in the actions dropdown no longer calls `POST /orders/:id/confirm-payment` blindly.
- It loads `/payments/order/:orderId` first:
  - pending payment → `PATCH /payments/:id/confirm`;
  - already confirmed payment → idempotent `POST /orders/:id/confirm-payment`;
  - no payment (order sent without one) → opens a modal to register the payment method (cash with change, Pix reference or card debit/credit), then creates the payment and confirms it.
- This fixes the "Nenhum pagamento registrado para este pedido" error when confirming an order from `/orders`.

## API Integration (Front → Back)
- Base URL: `VITE_API_URL` (Vercel dashboard) or fallback `https://quiosque-api.136-248-90-172.nip.io`
- Key endpoints:
  - `GET /shifts/current`
  - `GET /shifts/:id/products`
  - `GET /products?includeInactive=false`
  - `POST /orders` (create order)
  - `POST /orders/:id/submit` (reserve stock)
  - `POST /payments` (payment with `amount`/`reais`)
  - `GET /payments/order/:orderId` (list payments for order)
  - `PATCH /payments/:id/confirm` (confirm payment)
  - `POST /orders/:id/cancel` (cancel order)
  - `GET /cash/shift/:shiftId` (cash movements)
  - `GET /reports/cash/:shiftId` (cash summary with Pix/card/expected/difference)
  - `POST /shifts/:id/close` (persists expected/difference)
  - `GET /audit/logs` (API only; no UI yet)
- Front uses `formatReais` to display values; backend converts `*Cents` → reais via interceptor.

## Deploy
- Vercel: merge on `main` triggers automatic deploy.
- `vite build` compiles OK.
- Bundle contains fallback API URL when `VITE_API_URL` not set.

## Known Issues / Tech Debt
- No automated tests/lint in CI.
- `npm audit` vulnerabilities (pending review).
