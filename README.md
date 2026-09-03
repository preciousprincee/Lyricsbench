# LyricBench — full-stack app (MVP)

LyricBench started as a local-first, browser-only songwriting notebook.
This version turns it into a real multi-user app, with everything running
on infrastructure you own — no third-party auth or billing provider
required:

- **Frontend**: the original React/Vite app (`/frontend`), now backed by
  the API instead of `localStorage`, with email/password sign-in against
  the Django backend.
- **Backend**: a Django + Django REST Framework API (`/backend`) that
  handles its own authentication (Django's `User` model + a DRF auth
  token), stores all app data in a local SQLite database, proxies AI calls
  to Groq server-side with a flat monthly quota, and ships a customized
  Django admin as the ops console.
- **No paywall**: every account gets the same generous monthly AI
  generation allowance — there's no plan tier, checkout flow, or billing
  provider to wire up. Good for getting an MVP in front of people; add
  billing back later once you're ready to charge.

## Quick start

1. **Backend** — see `backend/README.md`. tl;dr:
   ```bash
   cd backend
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env  # fill in your Groq key
   python manage.py makemigrations accounts soundbible songs aiproxy
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # VITE_API_BASE_URL
   npm run dev
   ```

## Deployment

- **Backend** (Django + Postgres + Redis) → Render, via `render.yaml` (a
  Blueprint — see the comments at the top of that file for the exact steps).
- **Frontend** (the Vite/React app) → Vercel. `frontend/vercel.json` is
  already set up for it: import the repo in Vercel, set the project root to
  `frontend`, and set `VITE_API_BASE_URL` in Vercel's env vars to your
  Render backend URL + `/api` (e.g. `https://lyricbench-backend.onrender.com/api`).
- After the first Vercel deploy, copy its domain into `CORS_ALLOWED_ORIGINS`
  on the Render backend and redeploy — the two need to know about each
  other in both directions.

## What changed from the original local-first app

| Before | Now |
|---|---|
| Songs/Sound Bible in `localStorage` | Songs/Sound Bible in a Django-managed SQLite database, per-account |
| No accounts — one browser = one user | Django-authenticated accounts (email + password), multi-device |
| Groq API key pasted by the user in Settings | Server-side Groq key in Django, never exposed to the browser |
| No usage limits | A flat monthly generation allowance, enforced server-side |
| — | No billing, no plans — everyone gets the same MVP experience |
| No admin/ops tooling | Django admin: user management, account suspension, usage monitoring |

## Repo layout

```
backend/    Django project (config/, apps/accounts, soundbible, songs, aiproxy)
frontend/   The React app (mostly unchanged UI, new data/auth layer)
```
