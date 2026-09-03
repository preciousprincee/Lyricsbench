# LyricBench — Backend (Django)

This is the API for LyricBench: Django + Django REST Framework, using a
local **SQLite** database, Django's own auth system for accounts, and a
server-side **Groq** proxy so no AI key ever touches the browser. No
third-party auth provider, hosted database, or billing provider required —
this is set up to get an MVP running and in front of people as fast as
possible.

## Architecture at a glance

```
React (Vite)  ──email/password──▶  Django (/api/accounts/register/, /login/)
     │                                        │
     │  Authorization: Token <token>          │ issues a DRF auth token
     ▼                                        ▼
Django REST API  ────────────────▶  SQLite (backend/db.sqlite3)
     │
     └── /api/ai/chat/        → Groq (server-side key, quota-metered)

Django Admin (/admin/) — separate, staff-only login — is the ops console:
manage users, songs, and usage.
```

Identity model: **Django is the source of truth for who a user is.** The
same `User` model backs both customer accounts (via token auth) and staff
access to `/admin/`.

## 1. Local setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY at minimum

python manage.py makemigrations accounts soundbible songs aiproxy
python manage.py migrate
python manage.py createsuperuser   # this is your Django admin login, NOT a customer account
python manage.py runserver
```

The API is now at `http://localhost:8000/api/`, and the admin console at
`http://localhost:8000/admin/`.

Run `python manage.py checkenv` any time to see which required environment
variables are still missing.

## 2. Groq setup

Get a key at https://console.groq.com and put it in `GROQ_API_KEY`. This
key lives only on the server — the frontend never sees it, and every call
is metered against `MONTHLY_AI_GENERATIONS_LIMIT` in `.env` (one flat
allowance for every account — no plans). Check
https://console.groq.com/docs/models before deploying — Groq has retired
models before (most recently moving `llama-3.3-70b-versatile` and
`llama-3.1-8b-instant` to enterprise-only in June 2026); `GROQ_ALLOWED_MODELS`
in `config/settings.py` is the single place to update if that happens again.

## Scaling to thousands of concurrent users

The default `runserver` setup here is for local development only. For
real concurrency:

1. **Run gunicorn with gevent workers**, not the dev server:
   `gunicorn -c gunicorn_conf.py config.wsgi:application`. Almost every
   request in this app is I/O-bound (waiting on the database, or waiting a
   few seconds on Groq for AI generations) — gevent workers hold thousands
   of those waiting connections open per process instead of needing one OS
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

3. **Move off SQLite to Postgres** once you have real concurrent writers —
   SQLite is fine for an MVP and local dev, but it locks the whole database
   file per write, which becomes a bottleneck under real traffic. Swap the
   `DATABASES` block in `config/settings.py` for a Postgres connection
   (add `psycopg2-binary` and, if you like, `dj-database-url` back to
   `requirements.txt`) when you're ready.

4. **The AI quota gate is atomic**, not a `COUNT(*)` query per request —
   see the docstring in `apps/aiproxy/quota.py`. This matters under
   concurrency: a naive "count existing rows, then check the limit" has a
   race where many simultaneous requests from the same user can all read
   the same pre-increment count and all pass. The Redis-backed counter
   reserves quota atomically before the Groq call and refunds it if the
   call fails.

5. **Horizontal scaling**: this app keeps no in-process state beyond the
   DRF auth token lookup (a DB read, not a session), so you can run as many
   backend instances as you want behind a load balancer pointed at
   `/api/health/`, as long as they all share the same database and Redis.
   Frontend static assets (the Vite build output) should go behind a CDN
   rather than served from Django/whitenoise at real scale.

6. **Watch the Groq side too**: Groq itself rate-limits per API key. At
   genuinely large scale you'll hit Groq's own limits before Django's —
   `apps/aiproxy/groq_client.py` already surfaces a clean 429 back to the
   user rather than crashing, but you may want a queue (Celery + Redis) in
   front of generation requests instead of handling them fully
   synchronously in the request/response cycle.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/accounts/register/` | POST | Create an account, returns an auth token |
| `/api/accounts/login/` | POST | Log in, returns an auth token |
| `/api/accounts/logout/` | POST | Invalidate the current token |
| `/api/accounts/me/` | GET/PATCH | Current user's profile |
| `/api/accounts/me/summary/` | GET | Profile + usage in one call |
| `/api/sound-bible/` | GET/PUT/PATCH | The user's single Sound Bible |
| `/api/songs/` | GET/POST | List / create (upsert by `id`) songs |
| `/api/songs/{id}/` | GET/PATCH/DELETE | One song |
| `/api/ai/chat/` | POST | Quota-metered Groq proxy |

All endpoints except `register`/`login` require
`Authorization: Token <token>`.

## Admin console

`/admin/` (Jazzmin-skinned) gives the LyricBench team:

- **Profiles** — status badges, song count, usage this month, inline
  recent-songs preview, and bulk actions (suspend, reactivate).
- **Songs** — search/browse every user's songs for support.
- **Sound Bibles** — see and search everyone's style profiles.
- **AI request log** — every generation call, filterable by purpose,
  model, and month, for usage/cost monitoring.

Only Django superusers/staff (created via `createsuperuser` or promoted in
the admin) can access this — it is completely separate from customer
accounts.

## Deployment notes

- Put Django behind `gunicorn config.wsgi:application`, with
  `whitenoise` already wired up for static files.
- Set `DJANGO_DEBUG=False` and a real `DJANGO_SECRET_KEY` in production.
- If you outgrow SQLite, move to Postgres (see "Scaling" above) — SQLite's
  single-file database also means you're responsible for backing up
  `db.sqlite3` yourself if you deploy this as-is.
- Lock `CORS_ALLOWED_ORIGINS` down to your real frontend domain(s).
