---
name: webhook-verify
description: Verifies and debugs Mercado Pago webhook HMAC-SHA256 signatures with the offline verify_webhook_signature tool and explains how to implement the check in a backend. Use when webhook signature validation fails, when setting up webhook verification, or when a user shares x-signature and x-request-id headers.
---

# Webhook verify

Check a Mercado Pago `x-signature` header and pinpoint why a backend rejects valid notifications.

## When to use

- A backend rejects Mercado Pago webhooks with a signature mismatch.
- The user is adding signature verification to a webhook endpoint.
- The user pastes notification headers and wants to know if they are genuine.

## Steps

1. **Collect the three inputs.**
   - `x_signature`: the raw `x-signature` header, shaped like `ts=1704908010,v1=618c8534...`.
   - `x_request_id`: the raw `x-request-id` header.
   - `data_id`: the `data.id` value from the **URL query string** of the notification, not from the JSON body.
2. **Call `verify_webhook_signature`.** It runs offline and does not need `MP_ACCESS_TOKEN`. Prefer the `MP_WEBHOOK_SECRET` env var on the server over passing `secret` in chat. Pass `max_age_seconds` only if the user wants a freshness check.
3. **Read the result.**
   - `valid`: whether the HMAC matches.
   - `reason`: why it failed (malformed header, mismatch, or stale `ts`).
   - `manifest`: the exact string that was signed, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Ask the user to log the manifest their backend builds and diff it against this one.
4. **Check the two most common backend bugs first.**
   - Reading `data.id` from the JSON body instead of the query string. For some topics they differ or the body value is numeric while the query value is a string.
   - Not lowercasing alphanumeric `data.id` values before building the manifest. The tool lowercases it; the backend must do the same.
5. Then check the rest: wrong secret (test vs production app), header parsed with extra spaces, or the HMAC compared as a non-hex string.

## Backend reference

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

function isValidSignature({ xSignature, xRequestId, dataId, secret }) {
  const parts = Object.fromEntries(xSignature.split(',').map((p) => p.trim().split('=')));
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(parts.v1 ?? '', 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
```

## Rules

- Never echo the webhook secret back, even if the user pasted it.
- A valid signature only proves origin. Fetch the resource (for example `get_payment`) before trusting its state.
