# Mercado Pago rules

- Prefer the `mercadopago` MCP tools over raw `curl` or `fetch` calls to `api.mercadopago.com`.
- Never print, log, or echo `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, or `Authorization` headers. If the user pastes one, do not repeat it back.
- Mercado Pago has no public API endpoint for the live account balance. `/mercadopago_account/balance` is not publicly available and returns `403`. Do not invent or suggest a balance endpoint; use `search_payments` or the asynchronous settlement and release reports instead.
- The server is read-only by default. Do not assume `create_preference` or `refund_payment` exist unless the server runs with `MP_ALLOW_WRITES=true` / `MP_ALLOW_REFUNDS=true` (or `--allow-writes` / `--allow-refunds`).
- Always get explicit user confirmation, showing the exact payload, before calling `create_preference` or `refund_payment`. Reuse the same `idempotency_key` on retries.
- Treat a valid webhook signature as proof of origin only. Fetch the payment or order before acting on its state.
- Do not paste full payer data (document numbers, card details, addresses) unless the user asks for that field.
