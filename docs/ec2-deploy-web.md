# Deploying the Meguaz app on EC2

This deploys the **app itself** — the Vite front-end and the Next.js API
backend — on one EC2 instance with Docker Compose. The voice stack (LiveKit +
agent) has its own guide in [`ec2-deploy.md`](./ec2-deploy.md) and can share
the instance or run on its own.

## What runs where

```
Browser ──https──▶ Caddy (TLS)
                     ├── /            static Vite bundle (dist/)
                     └── /api/*  ──▶  Next.js container :3000
                                        ├── Supabase (auth, trips, rate/spend ledgers)
                                        └── Duffel / Perplexity / OpenAI / ElevenLabs /
                                            Mapbox / Google / SearchApi
```

Everything the browser calls is same-origin, so no CORS and no keys in the
bundle. The backend is stateless: rate limits, the global spend caps, and the
provider cache all persist in Supabase, so restarts and instance replacement
lose nothing (without Supabase they degrade to per-instance memory).

## 1. Launch the instance

- **Type:** `t3.small` is enough for the app alone; use `t3.medium` if the
  voice stack shares the box.
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04.
- **Elastic IP:** allocate + associate one.
- **Security group inbound:** 22 (SSH, locked to your IP), 80 and 443 (Caddy).

## 1b. Connect the Cloudflare domain (www.meguaz.com)

In the Cloudflare dashboard → **meguaz.com** → **DNS → Records**, add:

| Type | Name  | Content              | Proxy status         |
|------|-------|----------------------|----------------------|
| A    | `www` | `<your Elastic IP>`  | see modes below      |

Then pick one of two modes:

**Mode A — DNS only (grey cloud). Simplest; start here.**

1. Set the `www` record's proxy status to **DNS only** (click the orange cloud
   so it turns grey).
2. Set `MEGUAZ_DOMAIN=www.meguaz.com` in `deploy/.env`.
3. Done — Caddy provisions a Let's Encrypt certificate automatically on first
   boot (port 80 must be reachable for the challenge).

**Mode B — Proxied (orange cloud). Adds Cloudflare's CDN, WAF and DDoS shield.**

1. Keep the `www` record **Proxied** (orange cloud).
2. Cloudflare dashboard → **SSL/TLS → Overview** → set mode to
   **Full (strict)**.
3. **SSL/TLS → Origin Server → Create Certificate** (defaults are fine, 15-year
   validity; hostnames `meguaz.com, *.meguaz.com`). Save the certificate as
   `deploy/certs/origin.pem` and the private key as `deploy/certs/origin.key`
   on the EC2 box.
4. In `deploy/Caddyfile`, uncomment the
   `tls /certs/origin.pem /certs/origin.key` line.
5. Set `MEGUAZ_DOMAIN=www.meguaz.com` in `deploy/.env` and
   `docker compose up -d`.
6. Optional hardening: restrict the security group's 80/443 inbound rules to
   [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) so traffic cannot
   bypass the proxy.

The app already understands Cloudflare's proxy: anonymous rate limiting reads
`CF-Connecting-IP` (set authoritatively at the edge and not spoofable through
the proxy), so per-user limits stay accurate in Mode B.

**Catch the bare domain too.** So `meguaz.com` doesn't dead-end, add an apex
record and redirect it to `www`:

1. DNS → add `A` record, name `@`, content `192.0.2.1` (a placeholder — the
   redirect fires at the edge), proxy status **Proxied**.
2. **Rules → Redirect Rules → Create rule**: when hostname equals
   `meguaz.com`, static redirect to `https://www.meguaz.com`, status 301,
   preserve path and query.

## 2. Install Docker + Compose

Same as step 3 of [`ec2-deploy.md`](./ec2-deploy.md).

## 3. Configure

```bash
git clone <your-repo> meguaz && cd meguaz

# Backend environment (also read by docker compose):
cp web/.env.example deploy/.env
nano deploy/.env       # fill in keys; add MEGUAZ_DOMAIN=app.yourdomain.com
```

Notes on the knobs that matter in production:

- `SPEND_CAP_*` — global daily ceilings per provider (calls/day across ALL
  users). They **fail closed**: if the Supabase ledger is configured but
  unreachable, paid calls stop rather than run unmetered. Setting a cap to `0`
  is a kill switch for that provider.
- `SENTRY_DSN` — set it and every server error and client crash report is
  forwarded to Sentry; without it they still land in `docker logs` as
  structured JSON lines (ship those to CloudWatch with the awslogs driver or
  the CloudWatch agent if you prefer).
- `IP_HASH_SALT` — set a unique random value; it keys anonymous rate limiting.

## 4. Build the front-end

The Vite bundle is static; build it on the box (or in CI) so Caddy can serve it:

```bash
npm ci && npm run build          # → dist/
```

## 5. Launch

```bash
cd deploy
docker compose up -d --build
docker compose logs -f web       # structured JSON logs
curl -s localhost/api/health     # {"ok":true,...}
```

## 6. Verify

- `https://app.yourdomain.com` loads the app (Caddy provisioned TLS).
- `https://app.yourdomain.com/api/health` returns `{"ok":true}` — point ALB
  target-group health checks or an uptime monitor here.
- The `web` container reports `healthy` in `docker ps` (built-in HEALTHCHECK
  probes `/api/health`).

## Operating notes

- **Update:** `git pull && npm run build && (cd deploy && docker compose up -d --build web)`.
- **Scaling past one box:** the backend is stateless when Supabase is
  configured — put instances behind an ALB (health check `/api/health`) and the
  rate limits, spend caps and cache stay correct because they live in Supabase,
  not in process memory.
- **Costs:** the spend caps bound worst-case provider spend per day:
  cap × price-per-call, summed over providers — tune `SPEND_CAP_*` to the daily
  budget you can tolerate.
