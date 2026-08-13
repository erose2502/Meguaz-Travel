import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pronunciation audio from the backend's ElevenLabs proxy.
 *
 * Each clip is billed per character, so a phrase is fetched at most once per
 * session and replayed from an object URL after that.
 */
export function useSpeech() {
  const cache = useRef<Map<string, string>>(new Map())
  const audio = useRef<HTMLAudioElement | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urls = cache.current
    return () => {
      audio.current?.pause()
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const play = useCallback(async (text: string, language?: string) => {
    const key = (language ?? '') + ':' + text
    setError(null)
    audio.current?.pause()

    try {
      let url = cache.current.get(key)
      if (!url) {
        setBusyKey(key)
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language }),
        })
        if (!res.ok) throw new Error('speech unavailable')
        url = URL.createObjectURL(await res.blob())
        cache.current.set(key, url)
      }

      const el = new Audio(url)
      audio.current = el
      el.onended = () => setPlayingKey(null)
      el.onerror = () => setPlayingKey(null)
      setPlayingKey(key)
      await el.play()
    } catch {
      setError('Could not play that just now.')
      setPlayingKey(null)
    } finally {
      setBusyKey(null)
    }
  }, [])

  return { play, busyKey, playingKey, error }
}
