---
name: checkout-integration
description: Guides Checkout Pro integrations by checking available payment methods, auditing existing preferences, and creating new preferences only when write mode is enabled and the user confirms. Use when a user is integrating or troubleshooting Mercado Pago Checkout Pro, preferences, back URLs, notification URLs, or sandbox test flows.
---

# Checkout integration

Verify a Checkout Pro setup end to end, from the methods the account can accept to the preference the payer opens.

## When to use

- The user is building a Checkout Pro flow and wants to check their preference payload.
- A payment method the user expects does not show up in checkout.
- Payers are not redirected back, or webhooks never arrive for checkout payments.

## Steps

1. **Check payment methods.** Call `list_payment_methods`. Pass `site_id` (`MLA` Argentina, `MLB` Brazil, `MLM` Mexico, `MLC` Chile, `MCO` Colombia, `MPE` Peru, `MLU` Uruguay) when the user sells in a site other than the token's default. Use `payment_type_id` to narrow down, for example `credit_card` or `ticket`.
2. **Audit an existing preference.** Call `get_preference` with `preference_id` and check:
   - `items`: titles, `quantity`, `unit_price`, and `currency_id` match the order.
   - `back_urls` (`success`, `failure`, `pending`) are absolute HTTPS URLs, and `auto_return` is only set when `back_urls.success` exists.
   - `notification_url` is public HTTPS and reachable from the internet, not `localhost`.
   - `external_reference` is set to the user's order ID so payments can be traced back.
   - `expires`, `expiration_date_from`, and `expiration_date_to` are not already in the past.
3. **Create a preference only if allowed.** `create_preference` exists only when the server runs with `MP_ALLOW_WRITES=true` (or `--allow-writes`). Before calling it:
   - Show the full payload and wait for explicit confirmation.
   - Set a stable `external_reference`.
   - Generate one `idempotency_key` and reuse the same value on retries so a timeout does not create duplicates.
   If the tool is not registered, give the user the payload to send from their own backend instead.
4. **Test safely.** Remind the user to run the flow with test user credentials and test cards first, and to switch to production `APP_USR-` credentials only after the sandbox flow, redirects, and webhooks all work.

## Rules

- Never assume write mode is on. Check the available tools first.
- Never print the access token, and never ask the user to paste it in chat.
- Do not mix test and production credentials in the same flow; preferences and payments from one are invisible to the other.
