---
name: payment-debug
description: Diagnoses rejected, pending, or in-process Mercado Pago payments and reconciles merchant orders against their attached payments using the mercadopago MCP tools. Use when a user asks why a payment failed, why it is stuck in pending, or why an order shows a different state than its payments.
---

# Payment debug

Find out why a Mercado Pago payment ended in its current state and what to do next.

## When to use

- A payment was rejected and the user wants the reason.
- A payment is `pending` or `in_process` longer than expected.
- A merchant order is not marked paid even though a payment exists, or the amounts do not add up.

## Steps

1. **Locate the payment.**
   - Payment ID known: call `get_payment` with `payment_id`.
   - Otherwise: call `search_payments` filtering by `external_reference`, `payer_email`, `status`, or `begin_date` / `end_date`. Keep `limit` small and narrow the range before paging.
2. **Read `status` and `status_detail` together.** The detail carries the actual reason:

   | status_detail | Meaning | Next action |
   | --- | --- | --- |
   | `accredited` | Approved and credited | Nothing to fix on the payment side |
   | `cc_rejected_insufficient_amount` | Card has no funds | Payer retries with another card |
   | `cc_rejected_bad_filled_security_code` | Wrong CVV | Payer re-enters the security code |
   | `cc_rejected_bad_filled_date` | Wrong expiration date | Payer re-enters the date |
   | `cc_rejected_call_for_authorize` | Issuer wants manual authorization | Payer calls the issuer, then retries |
   | `cc_rejected_high_risk` | Blocked by fraud prevention | Use another payment method; do not retry the same card in a loop |
   | `pending_contingency` | Processing delayed on Mercado Pago's side | Wait for the webhook, do not create a new payment |
   | `pending_review_manual` | Under manual review | Wait, usually resolved within 2 business days |
   | `pending_waiting_payment` | Ticket or transfer not paid yet | Wait for the payer to pay offline |

   For any other value, report it verbatim instead of guessing.
3. **Reconcile with the order when states disagree.** Take `order.id` from the payment and call `get_merchant_order` with `merchant_order_id`. Compare:
   - `order_status` vs the status of each attached payment.
   - `paid_amount` vs `total_amount` (partial payments, refunds, or a second approved payment).
   - Every entry in `payments`, not only the latest one.
4. **Report.** Give the root cause in one or two sentences, then the concrete next action. Include payment ID, status, status_detail, amounts, and dates.

## Rules

- Never print the access token or Authorization headers.
- Do not paste full payer data (document numbers, full card info, addresses) unless the user asks for that specific field.
- A rejection is final for that payment. Fixing it means a new payment attempt, not editing the old one.
