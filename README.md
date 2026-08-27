# LyricBench — full-stack SaaS

LyricBench started as a local-first, browser-only songwriting notebook.
This version turns it into a real multi-user SaaS:

- **Frontend**: the original React/Vite app (`/frontend`), now backed by
  the API instead of `localStorage`, with Supabase Auth for sign-in/sign-up
  and a billing UI in Settings.
- **Backend**: a new Django + Django REST Framework API (`/backend`) that
  verifies Supabase Auth JWTs, stores all app data in Supabase Postgres,
  proxies AI calls to Groq server-side with per-plan quotas, handles Paystack
  subscription billing, and ships a customized Django admin as the ops
  console.
- **Supabase**: hosts Postgres (the actual database Django talks to) and
  Auth (email + Google sign-in, JWT issuance). Row data itself is fully
  owned by Django's ORM/migrations — Supabase is providing infra, not a
  second application layer.

## Quick start

1. **Backend** — see `backend/README.md`. tl;dr:
   ```bash
   cd backend
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env  # fill in Supabase/Paystack/Groq values
   python manage.py makemigrations accounts soundbible songs billing aiproxy
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_BASE_URL
   npm run dev
   ```

3. Visit `http://localhost:5173`, sign up, and you're in. Visit
   `http://localhost:8000/admin/` (log in with the superuser you created)
   for the ops console.

## What changed from the original app

| Before | Now |
|---|---|
| Songs/Sound Bible in `localStorage` | Songs/Sound Bible in Supabase Postgres, per-account, via Django API |
| No accounts — one browser = one user | Supabase Auth accounts (email + Google), multi-device |
| Groq API key pasted by the user in Settings | Server-side Groq key in Django, never exposed to the browser |
| No usage limits | Free/Pro monthly generation quotas, enforced server-side |
| No billing | Paystack checkout + card-management link, synced via webhooks |
| No admin/ops tooling | Django admin: user management, plan overrides, usage monitoring, billing audit log |

## Repo layout

```
backend/    Django project (config/, apps/accounts, soundbible, songs, billing, aiproxy)
frontend/   The React app (mostly unchanged UI, new data/auth layer)
```
