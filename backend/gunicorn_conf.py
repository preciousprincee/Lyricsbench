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
