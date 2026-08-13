# Meguaz launch checklist

The code side is done; every item here is a dashboard task in an external
service, so only you can complete them. Ordered by how loudly it breaks if
skipped.

## Supabase (breaks sign-in if skipped)

1. **OAuth redirect URLs** — Authentication → URL Configuration → Redirect URLs.
   Add both:
   - `https://www.meguaz.com/auth/callback`
   - `http://localhost:3000/auth/callback` (dev)
   Without these, "Continue with Google" bounces with a redirect error.
2. **Custom SMTP** — Authentication → Emails → SMTP Settings. Point at Resend,
   SES or Postmark. Supabase's built-in mailer allows only a handful of emails
   per hour, so signup confirmations and password resets will stall at the
   first small wave of users.

## Provider accounts (breaks money if skipped)

3. **Live keys** — confirm `DUFFEL_API_KEY` is a *live* key (test keys price
   fictional fares), and that OpenAI / Perplexity / ElevenLabs / SearchApi have
   billing enabled.
4. **Provider-side spend alerts** — set budget alerts in each provider's
   dashboard. The app's `SPEND_CAP_*` ceilings bound in-app spend; provider
   alerts are the backstop if a key ever leaks and is used outside the app.

## Monitoring (breaks silently if skipped)

5. **Uptime monitor** — create a free monitor at https://uptimerobot.com (or
   similar) probing `https://www.meguaz.com/api/health` every 5 minutes,
   alerting your email/phone. The endpoint returns `{"ok":true}`.
6. **CloudWatch logs** — on the EC2 box, attach an instance role with
   `CloudWatchAgentServerPolicy`, then start the stack with:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.cloudwatch.yml up -d
   ```
   Structured JSON logs land in the `meguaz-web` log group. (Without this,
   `docker compose logs web` still works — it just dies with the instance.)
7. **Sentry (optional)** — set `SENTRY_DSN` in `deploy/.env` and every server
   error and client crash report is forwarded automatically; nothing else to
   install.

## Analytics (optional, fits the privacy policy)

8. **Cloudflare Web Analytics** — free, cookie-less, and consistent with the
   "no ad tracking" promise in the privacy policy. In the Cloudflare dashboard:
   Analytics & Logs → Web Analytics → add site → copy the JS snippet. Paste it
   into `.figma/make/site.json` under:
   ```json
   "customScripts": { "headEnd": "<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"YOUR_TOKEN\"}'></script>" }
   ```
   Rebuild the front-end (`npm run build`) to bake it in. If the site is
   proxied (orange cloud), you can instead enable it with one click and no
   snippet.

## Already handled in code (no action)

- Global daily spend caps per provider, failing closed.
- Error boundary + error tracking endpoint.
- `/api/health` for probes; Docker HEALTHCHECK.
- Terms, privacy policy, cookie notice, signup consent line.
- Cache headers: hashed assets immutable, generated media 7 days.
- Trip deletion (also the GDPR "delete my data" path for trips).
