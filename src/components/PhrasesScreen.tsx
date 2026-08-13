import Icon from './Icon'
import Spinner from './Spinner'
import { useSpeech } from '../lib/useSpeech'

export type PhraseCard = {
  n: string
  native: string
  roman: string
  english: string
  shown: boolean
  learned: boolean
  toggleShown: () => void
  toggleLearned: () => void
}

type Props = {
  destCity: string
  phraseKicker: string
  learnedLabel: string
  phraseHint: string
  progressWidth: string
  phrases: PhraseCard[]
  /** ISO-639-1 code so ElevenLabs speaks the phrase in its own language. */
  speechLanguage?: string
  goHome: () => void
}

export default function PhrasesScreen({
  destCity,
  phraseKicker,
  learnedLabel,
  phraseHint,
  progressWidth,
  phrases,
  speechLanguage,
  goHome,
}: Props) {
  const speech = useSpeech()
  return (
    <div data-screen-label="Phrases" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'clamp(16px,2vw,26px)' }}>
        <button
          onClick={goHome}
          aria-label="Back to home"
          style={{
            width: 44,
            height: 44,
            flex: 'none',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 999,
            background: 'rgba(255,251,244,0.46)',
            backdropFilter: 'blur(28px) saturate(170%)',
            WebkitBackdropFilter: 'blur(28px) saturate(170%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--color-text)" />
        </button>
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            {phraseKicker}
          </p>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,44px)', lineHeight: 1.08, margin: '4px 0 0' }}>
            Before you land in {destCity}
          </h1>
        </div>
      </div>

      <div
        style={{
          borderRadius: 'clamp(24px,2.6vw,34px)',
          padding: 'clamp(16px,2vw,24px)',
          background: 'rgba(255,252,246,0.56)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 28px 56px -26px rgba(46,43,37,0.45)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{learnedLabel}</span>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{phraseHint}</span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: 'rgba(46,43,37,0.12)',
            overflow: 'hidden',
            marginTop: 12,
          }}
        >
          <span
            style={{
              display: 'block',
              height: '100%',
              borderRadius: 999,
              background: 'var(--color-accent-2-500)',
              width: progressWidth,
              transition: 'width 240ms ease',
            }}
          />
        </div>
      </div>

      {speech.error && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-accent-800)',
            background: 'var(--color-accent-100)',
            borderRadius: 12,
            padding: '10px 12px',
            margin: '12px 0 0',
          }}
        >
          {speech.error}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
          gap: 'clamp(10px,1.4vw,16px)',
          marginTop: 'clamp(12px,1.6vw,18px)',
        }}
      >
        {phrases.map((p) => (
          <div
            key={p.n + p.native}
            style={{
              borderRadius: 'clamp(22px,2.4vw,30px)',
              padding: 'clamp(16px,2vw,22px)',
              background: 'rgba(255,251,244,0.46)',
              backdropFilter: 'blur(30px) saturate(185%)',
              WebkitBackdropFilter: 'blur(30px) saturate(185%)',
              border: '1px solid rgba(255,255,255,0.55)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-neutral-700)',
                }}
              >
                {p.n}
              </span>
              {p.learned && <span className="tag tag-accent-2">Saved</span>}
              {(() => {
                const key = (speechLanguage ?? '') + ':' + p.native
                const loading = speech.busyKey === key
                const playing = speech.playingKey === key
                return (
                  <button
                    className="hv-white"
                    onClick={() => speech.play(p.native, speechLanguage)}
                    disabled={loading}
                    aria-label={'Hear "' + p.english + '" spoken'}
                    style={{
                      marginLeft: 'auto',
                      width: 34,
                      height: 34,
                      flex: 'none',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.7)',
                      background: playing ? 'var(--color-accent-200)' : 'rgba(255,255,255,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: loading ? 'progress' : 'pointer',
                    }}
                  >
                    {loading ? (
                      <Spinner size={13} />
                    ) : (
                      <Icon name="volume" size={16} color="var(--color-accent-700)" />
                    )}
                  </button>
                )
              })()}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(22px,2.4vw,28px)',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {p.native}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-accent-700)', margin: 0 }}>{p.roman}</p>
            {p.shown && <p style={{ fontSize: 14, color: 'var(--color-neutral-800)', margin: 0 }}>{p.english}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
              <button
                className="hv-white"
                onClick={p.toggleShown}
                style={{
                  flex: '1 1 120px',
                  padding: '11px 16px',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Meaning
              </button>
              <button
                className="hv-accent"
                onClick={p.toggleLearned}
                style={{
                  flex: '1 1 120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '11px 16px',
                  border: 0,
                  borderRadius: 999,
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Icon name="check" size={15} />
                Save
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 14,
          marginTop: 'clamp(14px,2vw,22px)',
          borderRadius: 'clamp(22px,2.4vw,30px)',
          padding: 'clamp(16px,2vw,22px)',
          background: 'rgba(225,238,204,0.5)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.65)',
        }}
      >
        <p
          style={{
            flex: '1 1 240px',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--color-neutral-800)',
            margin: 0,
          }}
        >
          Saved phrases ride along in your journey plan, so they&rsquo;re on the screen when you&rsquo;re standing at
          the counter.
        </p>
        <button
          className="hv-accent"
          onClick={goHome}
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 22px',
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back to search
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </div>
  )
}
