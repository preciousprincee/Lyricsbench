# LyricBench — Backend (Django + Supabase + Paystack)

This is the API for LyricBench: Django + Django REST Framework, using
**Supabase Postgres** as the database and **Supabase Auth** for
authentication, **Paystack** for subscription billing, and a server-side
**Groq** proxy so no AI key ever touches the browser.

## Architecture at a glance

```
React (Vite)  ──Supabase Auth JS──▶  Supabase Auth (issues JWT)
     │                                        │
     │  Authorization: Bearer <jwt>           │ verifies JWT (JWKS/HS256)
     ▼                                        ▼
Django REST API  ────────────────▶  Supabase Postgres (via DATABASE_URL)
     │
     ├── /api/ai/chat/        → Groq (server-side key, quota-metered)
     └── /api/billing/*       → Paystack (Checkout, Manage-card link, Webhooks)

Django Admin (/admin/) — separate, staff-only login — is the ops console:
manage users, plans, songs, usage, and subscriptions.
```

Identity model: **Supabase Auth is the source of truth for who a customer
is.** Django's own `User`/session auth is used only for `/admin/` (the
LyricBench team), never for customers.

## 1. Supabase setup

1. Create a project at https://supabase.com.
2. **Database**: Project Settings → Database → copy the connection string
   into `DATABASE_URL` in `.env`.
3. **Auth**: Project Settings → API. Copy `Project URL` → `SUPABASE_URL`,
   and the `anon` public key → `SUPABASE_ANON_KEY` (also needed on the
   frontend). Under Auth → JWT Settings, copy the `JWT Secret` into
   `SUPABASE_JWT_SECRET` if your project uses the legacy HS256 signing
   key. If your project uses the newer JWKS-based keys instead, leave
   `SUPABASE_JWT_SECRET` blank — the backend automatically verifies via
   `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
4. In Authentication → Providers, enable Email and (optionally) Google.
5. In Authentication → URL Configuration, add your frontend's URL
   (`http://localhost:5173` for local dev) to the redirect allow-list.

## 2. Local setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the values from the steps above

python manage.py makemigrations accounts soundbible songs billing aiproxy
python manage.py migrate
python manage.py createsuperuser   # this is your Django admin login, NOT a customer account
python manage.py runserver
```

The API is now at `http://localhost:8000/api/`, and the admin console at
`http://localhost:8000/admin/`.

Run `python manage.py checkenv` any time to see which required environment
variables are still missing.

## 3. Paystack setup

Paystack is used instead of Stripe (Stripe doesn't support Nigerian
merchant accounts). Billing flow:

1. Create a [Paystack](https://paystack.com) account and switch to Test
   mode for development.
2. Dashboard → Settings → API Keys & Webhooks: copy the **Secret Key**
   into `PAYSTACK_SECRET_KEY` and the **Public Key** into
   `PAYSTACK_PUBLIC_KEY`.
3. Dashboard → Products → Plans: create a "LyricBench Pro" plan for
   monthly billing and another for yearly (Paystack plans are one
   interval each, unlike a Stripe Price with multiple intervals). Copy
   each plan's code (`PLN_...`) into `PAYSTACK_PLAN_CODE_PRO_MONTHLY` /
   `PAYSTACK_PLAN_CODE_PRO_YEARLY`.
4. Same page → Webhooks: set the webhook URL to
   `https://your-api-domain.com/api/billing/webhook/` (for local testing,
   tunnel with `ngrok http 8000` and use the ngrok URL). No separate
   signing secret is needed — Paystack signs webhooks with your secret key
   itself, which `PaystackWebhookView` verifies via the
   `X-Paystack-Signature` header.
5. Subscribe the webhook to at least: `charge.success`,
   `subscription.create`, `subscription.disable`,
   `subscription.not_renew`, `invoice.payment_failed`.

**How upgrade works**: `POST /api/billing/checkout/` initializes a Paystack
transaction with the chosen plan attached and returns a hosted
`checkout_url` — the frontend redirects there, Paystack creates the
subscription automatically on successful payment, and the webhook flips
`Profile.plan` to `pro`.

**Managing/cancelling**: Paystack has no Stripe-style self-serve billing
portal. `POST /api/billing/portal/` returns Paystack's "update card" hosted
link (`portal_url`) via their `/subscription/:code/manage/link` endpoint —
customers use it to change or remove their card, which is what stops
renewal. This is a real feature gap versus Stripe, not an implementation
shortcut; if you need full self-serve invoice history too, that currently
requires a support request or a custom page built on the Paystack API.

**Currency**: Paystack plans are created in a specific currency (NGN by
default for Nigerian accounts; also supports GHS, ZAR, KES, USD depending
on your business country). Amounts are stored in the currency's subunit
(kobo for NGN), matching how `Subscription.unit_amount_cents` is used.

## 4. Groq setup

Get a key at https://console.groq.com and put it in `GROQ_API_KEY`. This
key lives only on the server — the frontend never sees it, and every call
is metered against the user's plan (`FREE_PLAN_MONTHLY_GENERATIONS` /
`PRO_PLAN_MONTHLY_GENERATIONS` in `.env`). Check
https://console.groq.com/docs/models before deploying — Groq has retired
models before (most recently moving `llama-3.3-70b-versatile` and
`llama-3.1-8b-instant` to enterprise-only in June 2026); `GROQ_ALLOWED_MODELS`
in `config/settings.py` is the single place to update if that happens again.

## Scaling to thousands of concurrent users

The default `runserver` setup here is for local development only. For
real concurrency:

1. **Run gunicorn with gevent workers**, not the dev server:
   `gunicorn -c gunicorn_conf.py config.wsgi:application`. Almost every
   request in this app is I/O-bound (waiting on Postgres, or waiting a few
   seconds on Groq for AI generations) — gevent workers hold thousands of
   those waiting connections open per process instead of needing one OS
   thread per in-flight request. `gunicorn_conf.py` is already tuned for
   this; scale `workers`/`WEB_CONCURRENCY` with your machine's CPU count.

2. **Set `REDIS_URL`.** Without it, `CACHES` falls back to Django's
   per-process `LocMemCache`, which silently breaks two things once you
   run more than one worker/process: DRF's rate limiting (each process
   counts requests separately, so the real limit becomes `rate × workers`)
   and the AI monthly-quota counter in `apps/aiproxy/quota.py` (each
   process would track its own count, letting users exceed their quota).
   A shared Redis instance fixes both and is required, not optional, past
   a single process.

3. **Use Supabase's connection-pooling URI** (port 6543, pgbouncer) for
   `DATABASE_URL` instead of the direct connection (port 5432). Postgres
   has a hard cap on direct connections; pooling is what lets many
   gunicorn workers × many machines share the database safely.

4. **The AI quota gate is atomic**, not a `COUNT(*)` query per request —
   see the docstring in `apps/aiproxy/quota.py`. This matters under
   concurrency: a naive "count existing rows, then check the limit" has a
   race where many simultaneous requests from the same user can all read
   the same pre-increment count and all pass. The Redis-backed counter
   reserves quota atomically before the Groq call and refunds it if the
   call fails.

5. **Horizontal scaling**: this app has no in-process state (auth is
   stateless JWT verification, no server-side sessions), so you can run
   as many backend instances as you want behind a load balancer pointed
   at `/api/health/`, as long as they all share the same Postgres and
   Redis. Frontend static assets (the Vite build output) should go behind
   a CDN rather than served from Django/whitenoise at real scale.

6. **Watch the Groq side too**: Groq itself rate-limits per API key. At
   genuinely large scale you'll hit Groq's own limits before Django's —
   `apps/aiproxy/groq_client.py` already surfaces a clean 429 back to the
   user rather than crashing, but you may want a queue (Celery + Redis) in
   front of generation requests instead of handling them fully
   synchronously in the request/response cycle.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/accounts/me/` | GET/PATCH | Current user's profile |
| `/api/accounts/me/summary/` | GET | Profile + usage + subscription in one call |
| `/api/sound-bible/` | GET/PUT/PATCH | The user's single Sound Bible |
| `/api/songs/` | GET/POST | List / create (upsert by `id`) songs |
| `/api/songs/{id}/` | GET/PATCH/DELETE | One song |
| `/api/ai/chat/` | POST | Quota-metered Groq proxy |
| `/api/billing/checkout/` | POST | Start a Paystack checkout transaction |
| `/api/billing/portal/` | POST | Get the Paystack card-management link |
| `/api/billing/webhook/` | POST | Paystack → Django webhook receiver |

All endpoints except the webhook require `Authorization: Bearer <supabase-jwt>`.

## Admin console

`/admin/` (Jazzmin-skinned) gives the LyricBench team:

- **Profiles** — plan/status badges, song count, usage this month, inline
  recent-songs preview, and bulk actions (comp to Pro, downgrade, suspend,
  reactivate).
- **Songs** — search/browse every user's songs for support.
- **Sound Bibles** — see and search everyone's style profiles.
- **Subscriptions** & **Billing events** — Paystack sync status and a raw
  webhook audit log.
- **AI request log** — every generation call, filterable by purpose,
  model, and month, for usage/cost monitoring.

Only Django superusers/staff (created via `createsuperuser` or promoted in
the admin) can access this — it is completely separate from customer
accounts.

## Deployment notes

- Put Django behind `gunicorn config.wsgi:application`, with
  `whitenoise` already wired up for static files.
- Set `DJANGO_DEBUG=False` and a real `DJANGO_SECRET_KEY` in production.
- Use Supabase's **connection pooling** URI (port 6543) for `DATABASE_URL`
  in serverless/many-worker deployments.
- Lock `CORS_ALLOWED_ORIGINS` down to your real frontend domain(s).
