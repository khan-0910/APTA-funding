import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile (free) in front of sign-in, sign-up and password reset, so bots
 * can't mass-create accounts or burn the Supabase email quota. Off unless
 * VITE_TURNSTILE_SITE_KEY is set; Supabase verifies the token server-side once CAPTCHA
 * protection is switched on in the dashboard (README → Bot protection).
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
export const CAPTCHA_ON = Boolean(SITE_KEY)

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load the security check.'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Renders the challenge; remount it (change its `key`) after each use — tokens are single-use. */
export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const cb = useRef(onToken)
  cb.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
    let id: string | undefined
    let cancelled = false
    cb.current(null)
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        id = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        })
      })
      .catch(() => cb.current(null))
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [])

  if (!SITE_KEY) return null
  return <div ref={box} className="min-h-[65px]" />
}
