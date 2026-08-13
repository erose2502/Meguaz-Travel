import type { CSSProperties } from 'react'
import Icon from './Icon'

export type LegalPage = 'terms' | 'privacy'

type Props = {
  page: LegalPage
  onSwitch: (page: LegalPage) => void
  goHome: () => void
}

type Section = { heading: string; body: string[] }

const LAST_UPDATED = 'August 13, 2026'
const CONTACT = 'everroseinc@gmail.com'

// Plain-language legal pages written against what the app actually does.
// Template terms, not legal advice — have counsel review before a public launch.

const TERMS: Section[] = [
  {
    heading: '1. What Meguaz is',
    body: [
      'Meguaz is a travel planning tool. It gathers live prices and schedules from partners (airlines via Duffel, ground operators, accommodation providers) and assembles door-to-door trip plans against your budget and arrival deadline.',
      'Meguaz is not an airline, carrier or accommodation provider. Any ticket or reservation is a contract between you and that provider, on their terms.',
    ],
  },
  {
    heading: '2. Prices and plans are estimates',
    body: [
      'Fares, transfer times and costs shown in a plan are live estimates at the moment of the search. Airline offers expire within minutes, traffic changes, and operators adjust prices. Always confirm the final price at checkout before paying.',
      "Timeline figures such as “leave home by” include buffers and typical processing times. They are planning aids, not guarantees. You are responsible for allowing enough time for your own journey, including check-in cut-offs, border control and visas.",
    ],
  },
  {
    heading: '3. Your account',
    body: [
      'You need an account to save trips and preferences. Keep your credentials confidential; activity under your account is your responsibility. You must provide accurate information and be at least 18 (or the age of majority where you live) to book travel.',
    ],
  },
  {
    heading: '4. Acceptable use',
    body: [
      'Do not scrape, overload or resell the service, probe its security, or use automated tools to fire searches. Searches call paid partner APIs, so we enforce per-user rate limits and global daily capacity ceilings; abusive traffic may be throttled or blocked.',
    ],
  },
  {
    heading: '5. Liability',
    body: [
      'The service is provided “as is” without warranties of any kind. To the maximum extent permitted by law, Meguaz is not liable for missed flights, changed fares, provider cancellations, or indirect and consequential losses. Nothing in these terms limits liability that cannot be limited by law.',
    ],
  },
  {
    heading: '6. Changes and termination',
    body: [
      'We may update the service and these terms; material changes will be shown in the app with the new effective date. We may suspend accounts that break these terms. You can stop using Meguaz and ask for deletion of your account and data at any time.',
    ],
  },
  {
    heading: '7. Contact',
    body: [`Questions about these terms: ${CONTACT}.`],
  },
]

const PRIVACY: Section[] = [
  {
    heading: '1. What we collect',
    body: [
      'Account data: your email address, password (stored hashed by our auth provider, Supabase) and optional display name.',
      'Trip data: the briefs you search (origin, destination, dates, budget, party size, trip length) and the trips you choose to save.',
      'Preferences: home airport, travel style, preferred cabin, usual budget and airport buffer, saved so future trips pre-fill.',
      'Precise location: only if you grant the browser permission. Your coordinates are sent to our server to find nearby airports, name your city and compute live drive times to the airport. They are used per request and are not stored as a location history.',
      'Voice: if you use the voice agent, your microphone audio is processed in real time to run the conversation. Grant or deny microphone access at any time in your browser.',
      'Technical data: rate-limit counters keyed by your user ID or a salted hash of your IP address, and error reports (error message, stack trace, page URL, browser type) used to fix crashes.',
    ],
  },
  {
    heading: '2. What we use it for',
    body: [
      'To run the product: solve trip plans, price flights, remember your trips and preferences, and keep the service safe (rate limiting, abuse prevention).',
      'We do not sell your personal data and we do not use it for third-party advertising.',
    ],
  },
  {
    heading: '3. Who processes it',
    body: [
      'Trip searches are fulfilled by partner APIs acting as processors: Duffel (flights and stays), Perplexity (ground transport research), OpenAI (chat and voice assistant), ElevenLabs (phrase pronunciation audio), LiveKit (voice transport), Mapbox and Google (geocoding and drive times), and SearchApi (hotel search). Only the data needed for each request is sent — for example a route and date, never your account profile.',
      'Hosting, authentication and the database are provided by Supabase. Error reports may be forwarded to a Sentry-compatible error tracking service.',
      'Because Meguaz plans international travel, searches necessarily flow to providers that may be outside your country. Providers are bound by their own data processing agreements.',
    ],
  },
  {
    heading: '4. Cookies and local storage',
    body: [
      'Meguaz uses essential cookies only: the session cookies our auth provider sets to keep you signed in. There are no advertising or cross-site tracking cookies.',
      "Your browser's local storage holds small app settings such as this notice's dismissal and on-device phrase progress. Clearing site data removes them.",
    ],
  },
  {
    heading: '5. Retention and deletion',
    body: [
      'Saved trips and preferences are kept until you delete them or your account. Rate-limit counters expire within days; cached route data holds no personal information. Error reports are retained only as long as needed to fix the issue.',
      `To access or delete everything we hold about you, email ${CONTACT} from your account address. Deletion is completed within 30 days.`,
    ],
  },
  {
    heading: '6. Your rights',
    body: [
      'Depending on where you live (e.g. GDPR in the EU/UK, CCPA in California) you may have rights to access, correct, export, delete or restrict processing of your personal data, and to complain to your supervisory authority. Exercise any of these via the contact address below.',
    ],
  },
  {
    heading: '7. Children',
    body: ['Meguaz is not directed at children under 16 and we do not knowingly collect their data.'],
  },
  {
    heading: '8. Contact',
    body: [`Privacy questions and requests: ${CONTACT}.`],
  },
]

const TAB: CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 999,
  border: 0,
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

export default function LegalScreen({ page, onSwitch, goHome }: Props) {
  const sections = page === 'terms' ? TERMS : PRIVACY
  const title = page === 'terms' ? 'Terms of Service' : 'Privacy & Cookies'

  return (
    <div data-screen-label="Legal" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className="glass hv-white"
          onClick={goHome}
          aria-label="Back to home"
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={16} color="var(--color-text)" />
        </button>
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            Legal · last updated {LAST_UPDATED}
          </p>
          <h1 style={{ fontSize: 'clamp(22px,2.8vw,32px)', lineHeight: 1.1, margin: '2px 0 0' }}>{title}</h1>
        </div>
      </div>

      <div
        className="glass"
        style={{ display: 'flex', gap: 6, padding: 6, borderRadius: 999, marginBottom: 14 }}
      >
        {(['terms', 'privacy'] as LegalPage[]).map((p) => (
          <button
            key={p}
            onClick={() => onSwitch(p)}
            aria-pressed={page === p}
            style={{
              ...TAB,
              background: page === p ? 'var(--color-accent)' : 'transparent',
              color: page === p ? 'var(--color-bg)' : 'var(--color-text)',
            }}
          >
            {p === 'terms' ? 'Terms of Service' : 'Privacy & Cookies'}
          </button>
        ))}
      </div>

      <div className="glass-strong" style={{ borderRadius: 22, padding: 'clamp(18px,2.4vw,28px)' }}>
        {sections.map((section) => (
          <section key={section.heading} style={{ margin: '0 0 18px' }}>
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>{section.heading}</h2>
            {section.body.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--color-neutral-800)',
                  margin: '0 0 8px',
                }}
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
