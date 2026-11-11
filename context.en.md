# Quiosque do Coco - Web (Vercel) - Context

## Overview
React + Vite frontend for the Quiosque do Coco system, deployed on Vercel.
Pages: PDV (point-of-sale), Orders (order management), Products, Shifts, Stock, Reports.

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

## Technical Changes (1 file modified)
- `web/src/pages/PDV.tsx` - Complete rewrite of the sale state machine, payloads, and validation.

## Deploy
- Vercel: merge on `main` triggers automatic deploy.
- `vite build` compiles successfully.
- Bundle contains fallback API URL `https://quiosque-api.136-248-90-172.nip.io` when `VITE_API_URL` not set in environment.

## P1 Hardening (branch `fix/confirm-payment-e-hardening`)
- **Shifts UI**: `Shifts.tsx` loads `/reports/cash/:shiftId` and shows real Pix and card totals, with debit/credit breakdown.
- **Shift detail**: both "Ver detalhes" and "Movimentações de caixa" open the same detail view; closed shifts show counted cash, persisted difference and notes, and hide the close action.
- **Closing values**: "Esperado em Dinheiro" and "Diferença projetada" use the API cash summary (falling back to the persisted shift values while loading).
- **Contract note**: currency fields keep the `*Cents` suffix in responses but carry reais (backend `CurrencyResponseInterceptor`).
- **Validation**: `vite build` passes.

## Orders payment recovery (2026-11-11)
- Orders sent to payment without a payment record can now be confirmed from `/orders`.
- The action checks `/payments/order/:orderId` and either confirms the pending payment or opens a modal to register the method (cash/change, Pix reference, card debit/credit) before confirming.
- Fixes the `Nenhum pagamento registrado para este pedido` error; the backend confirmation remains the single source of truth.

## P1 Pending (outside P0)
- Automated tests (unit/e2e).
- `GET /shifts/current` may return `availability.product` as an id (older API) or as a full object (API PR #4); the PDV handles both formats.
- Audit UI page (endpoint exists on the API).
- Absence of lint/tests in CI.

## Repository Git (web)
- Branch: `main` (protected)
- Last commit: `59aa458 chore: versiona apenas .env.example (remove .env.production)` + `c5096a7 feat: frontend usa Reais (R$) em vez de centavos`
- Merged PRs:
  - #1: `fix: PDV fluxo de venda (pedido único e pagamento em reais)` (c5096a7)
  - #2: `chore: versiona apenas .env.example (remove .env.production)` (59aa458)
- `.env.production` removed from tracking; only `.env.example` versioned.
- `.gitignore` ignores `.env` and `.env.*`, releases only `.env.example`.

## API Integration (Front → Back)
- Base URL: `VITE_API_URL` (painel Vercel) or fallback `https://quiosque-api.136-248-90-172.nip.io`
- Endpoints used:
  - `GET /shifts/current`
  - `GET /products?includeInactive=false`
  - `POST /orders` (create order)
  - `POST /orders/:id/submit` (reserve stock)
  - `POST /payments` (payment with `amount`/`reais`)
  - `GET /payments/order/:orderId` (list payments for order)
  - `PATCH /payments/:id/confirm` (confirm payment)
  - `POST /orders/:id/cancel` (cancel order)
  - `POST /orders/:id/submit` (reserve)
- Front uses `formatReais` to display values; backend converts `*Cents` → reais via interceptor.

## Modified Files
- `web/src/pages/PDV.tsx` - Complete PDV state machine rewrite, payloads, validation.

## Deploy
- Vercel: merge on `main` triggers automatic deploy.
- `vite build` compiles OK.
- Bundle contains fallback API URL.

## Known Issues / Tech Debt
- No automated tests/lint in CI.
- `npm audit` vulnerabilities (pending review).
