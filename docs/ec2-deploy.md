# Self-hosting the Meguaz voice agent on EC2

This runs the **whole voice stack on your own EC2 box** — the LiveKit media
server (SFU) *and* the agent worker — so you are off LiveKit Cloud entirely and
there is no usage quota. The cloud agent has already been deleted.

Everything lives in [`agent/`](../agent): `main.py` (the agent), `Dockerfile`,
and [`agent/deploy/`](../agent/deploy) (the compose stack).

## What runs where

```
Browser ──wss──▶ Caddy (TLS) ──▶ LiveKit server (SFU) ──▶ Meguaz agent worker
   ▲                                                            │
   └────────────────── your Next.js app (token + search APIs) ──┘
```

- **Caddy** terminates HTTPS/WSS and reverse-proxies to LiveKit. Browsers only
  grant microphone access over a secure origin, so WSS is mandatory.
- **LiveKit server** is the open-source SFU that replaces LiveKit Cloud.
- **Agent worker** connects to LiveKit over localhost and calls your web app's
  search APIs for its tools.

## 1. Launch the instance

- **Type:** `t3.medium` is plenty for MVP (2 vCPU / 4 GB). Voice is CPU-light.
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04.
- **Elastic IP:** allocate one and associate it, so the DNS record stays valid
  across reboots.
- **Security group — inbound:**

  | Port | Protocol | Purpose |
  |------|----------|---------|
  | 22 | TCP | SSH (lock to your IP) |
  | 80 | TCP | Caddy — TLS provisioning (HTTP-01 challenge) |
  | 443 | TCP | Caddy — HTTPS/WSS signaling |
  | 7881 | TCP | LiveKit RTC over TCP fallback |
  | 50000–60000 | UDP | LiveKit WebRTC media |

## 2. DNS

Point an **A record** (e.g. `voice.yourdomain.com`) at the Elastic IP. Caddy
provisions the TLS certificate automatically on first boot once this resolves.

## 3. Install Docker + Compose

```bash
# Amazon Linux 2023
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user      # log out/in after this
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
```

## 4. Get the code and configure

```bash
git clone <your-repo> meguaz && cd meguaz/agent/deploy
cp .env.example .env

# Generate fresh LiveKit credentials — do NOT reuse the old Cloud keys:
echo "LIVEKIT_API_KEY=API$(openssl rand -hex 6)"    # e.g. APIa1b2c3d4e5f6
echo "LIVEKIT_API_SECRET=$(openssl rand -hex 32)"

# Edit .env: paste those two values, set MEGUAZ_DOMAIN, OPENAI_API_KEY,
# and MEGUAZ_API_BASE (your deployed web app URL).
nano .env
```

## 5. Launch

```bash
docker compose up -d --build
docker compose logs -f agent     # look for "registered worker"
```

Caddy grabs the TLS cert (watch `docker compose logs caddy` for `certificate
obtained`). The agent registers with the local LiveKit server and waits for
rooms.

## 6. Point the web app at your server

In the Next.js app's environment (`web/.env.local`, or your Vercel project),
replace the three LiveKit values with your self-hosted ones:

```
LIVEKIT_URL=wss://voice.yourdomain.com
LIVEKIT_API_KEY=API...        # the key you generated in step 4
LIVEKIT_API_SECRET=...        # the secret you generated in step 4
```

The token route (`/api/livekit/token`) signs join tokens with these; because the
server is configured with the same pair, the tokens validate. No app code
changes — only these env values.

## 7. Verify

Open the app, hit **Connect to agent**. The browser joins `wss://voice.yourdomain.com`,
the agent greets you, and its flight/stay/ground tools call `MEGUAZ_API_BASE`.

## Operating notes

- **Updating the agent:** `git pull && docker compose up -d --build agent`.
- **Logs:** `docker compose logs -f agent | livekit | caddy`.
- **Cost:** a `t3.medium` on-demand is ~$30/mo flat — no per-minute metering,
  which is the point of moving off Cloud.
- **Scaling past one box:** add Redis to `livekit.yaml` and run multiple LiveKit
  nodes behind a load balancer; the agent scales horizontally on its own.
- **Keeping LiveKit Cloud SFU instead** (only moving the worker off Cloud): skip
  Caddy/LiveKit here, run just the `agent` service with `LIVEKIT_URL` set to your
  Cloud `wss://…` URL and the Cloud keys. Note this does **not** relieve the
  Cloud usage quota, since media still flows through Cloud.
