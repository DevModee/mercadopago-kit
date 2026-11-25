# Mercado Pago Kit

Antigravity plugin for working with Mercado Pago from the agent. It bundles:

- The [`mercadopago-mcp`](https://github.com/DevModee/mercadopago-mcp) server, launched with `npx -y mercadopago-mcp`. Read-only by default.
- Three skills: payment debugging, webhook signature verification, and Checkout Pro integration.
- Agent rules in `rules/AGENTS.md` that keep tokens out of the chat and block guessed endpoints.

## Requirements

- Node.js 20 or newer (`npx` must be on your `PATH`).
- `MP_ACCESS_TOKEN`: a Mercado Pago access token. Use a test user token while developing.
- `MP_WEBHOOK_SECRET` (optional): the webhook secret from Your integrations, used by `verify_webhook_signature`.

Set them in the environment Antigravity starts from, not in the plugin files:

```sh
export MP_ACCESS_TOKEN="TEST-..."
export MP_WEBHOOK_SECRET="..."
```

## Installation

From GitHub:

```sh
agy plugin install https://github.com/DevModee/mercadopago-kit
```

From a local clone:

```sh
git clone https://github.com/DevModee/mercadopago-kit.git
agy plugin install ./mercadopago-kit
```

## Read-only by default

Only read tools are registered unless you opt in. To enable writes, set these before starting Antigravity:

| Variable | Enables |
| --- | --- |
| `MP_ALLOW_WRITES=true` | `create_preference` |
| `MP_ALLOW_REFUNDS=true` | `refund_payment` |

The rules tell the agent to show the payload and wait for your confirmation before calling either one, and to reuse the same `idempotency_key` on retries.

## Tools

| Tool | Mode | What it does |
| --- | --- | --- |
| `get_payment` | read | Fetch one payment by ID |
| `search_payments` | read | Search by status, `external_reference`, payer email, and date range |
| `get_merchant_order` | read | Fetch a merchant order with its attached payments |
| `get_preference` | read | Fetch a Checkout Pro preference |
| `list_payment_methods` | read | List payment methods, optionally per site (`MLA`, `MLB`, `MLM`, ...) |
| `verify_webhook_signature` | read, offline | Check an `x-signature` header with HMAC-SHA256, no access token needed |
| `create_preference` | write, opt-in | Create a Checkout Pro preference |
| `refund_payment` | write, opt-in | Refund a payment fully or partially |

## Skills

- `payment-debug`: explains rejected or pending payments from `status_detail` and reconciles merchant orders against their payments.
- `webhook-verify`: checks webhook signatures and points at the usual backend bugs (`data.id` read from the body instead of the query string, or not lowercased).
- `checkout-integration`: audits payment methods and preferences, and creates preferences only when write mode is on and you confirm.

## Known API limitations

Mercado Pago does not expose a public endpoint for the live account balance. `/mercadopago_account/balance` returns `403`. The closest options are `search_payments` and the asynchronous settlement and release reports from the Mercado Pago dashboard or reports API.

## Local verification

```sh
npm run lint && npm test
```

`lint` syntax-checks the scripts and tests, parses every JSON file, and rejects em-dash characters. `test` validates `plugin.json` against the Antigravity v1 plugin schema, the MCP config, the skill frontmatter, and the rules file. No dependencies to install.

## License

MIT
