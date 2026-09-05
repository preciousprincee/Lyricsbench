"""
Gunicorn config for production. Run with:

    gunicorn -c gunicorn_conf.py config.wsgi:application

Why gevent workers: almost every request here is I/O-bound (waiting on
Postgres, or waiting on Groq's API for AI generations, sometimes for a few
seconds). Sync workers block an entire OS process/thread for that whole
wait, so you'd need one worker per concurrent in-flight request. Gevent
workers cooperatively switch during I/O waits, so a single worker can hold
open thousands of slow, mostly-idle connections at once — which is exactly
this app's traffic shape. If you later add CPU-heavy work, move it to a
background task queue rather than switching worker classes.
"""
# This must run before anything else in the process imports `threading` —
# including Django, which builds its per-thread connection storage off of
# threading.local() the first time django.db is imported. gunicorn's gevent
# worker also patches in init_process(), but that can run too late relative
# to import order depending on how gunicorn loads the app, and the failure
# mode is silent: Django's connection handler ends up keyed by the real OS
# thread (constant for every greenlet in this one worker) instead of by
# greenlet identity, so a connection opened by one request looks "shared"
# with every other concurrent request — which Django's own thread-safety
# check then correctly rejects with "DatabaseWrapper objects created in a
# thread can only be used in that same thread." Patching here, at gunicorn
# config load time (before fork, before the app is ever imported), removes
# the ordering risk entirely. monkey.patch_all() is idempotent, so this is
# safe even though the gevent worker also patches on its own.
from gevent import monkey
monkey.patch_all()

import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

worker_class = "gevent"
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_connections = int(os.getenv("GUNICORN_WORKER_CONNECTIONS", "1000"))

timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
graceful_timeout = 30
keepalive = 5

# Restarting workers periodically guards against slow memory growth in a
# long-running gevent process; jitter avoids every worker restarting at once.
max_requests = 2000
max_requests_jitter = 200

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")


def post_fork(server, worker):
    # psycopg2 is a synchronous C driver — its socket I/O is invisible to
    # gevent's event loop on its own. Without this patch, a connection can
    # get resumed on a different greenlet than the one that opened it after
    # a context switch mid-query, which Django's thread-safety check (cor-
    # rectly) rejects with "DatabaseWrapper objects created in a thread can
    # only be used in that same thread." This must run per-worker, after
    # fork (gunicorn's gevent worker already called gevent.monkey.patch_all()
    # by this point) and before any DB connection is opened in that worker.
    from psycogreen.gevent import patch_psycopg
    patch_psycopg()
