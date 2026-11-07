import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Display language. Every Tamil string in the UI is rendered inside a `.ta` element,
 * so "English only" is a single CSS rule (`html[data-lang="en"] .ta { display: none }`)
 * and needs no re-render. Plain strings that can't hold markup (<option>, placeholder,
 * title) go through `bi()`, which drops the " / தமிழ்" part in English mode.
 */
export type Lang = 'en' | 'bi'
const KEY = 'apta-lang'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null)

/** Index of the " / " that starts a Tamil translation, or -1. */
function tamilSplit(s: string): number {
  return s.search(/\s\/\s[^/]*[஀-௿]/)
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = window.localStorage.getItem(KEY)
      if (saved === 'en' || saved === 'bi') return saved
    } catch {
      /* storage blocked */
    }
    return navigator.language.toLowerCase().startsWith('ta') ? 'bi' : 'en'
  })

  useEffect(() => {
    document.documentElement.dataset.lang = lang
    document.documentElement.lang = lang === 'bi' ? 'ta' : 'en'
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      window.localStorage.setItem(KEY, l)
    } catch {
      /* storage blocked */
    }
  }, [])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}

/** Returns `bi(text)`: the full "English / தமிழ்" text, or just the English part. */
export function useBi(): (s: string) => string {
  const { lang } = useLang()
  return useCallback(
    (s: string) => {
      if (lang === 'bi') return s
      const i = tamilSplit(s)
      return i < 0 ? s : s.slice(0, i)
    },
    [lang],
  )
}

/** Renders a runtime "English / தமிழ்" string with the Tamil half in a `.ta` span. */
export function T({ children }: { children: string }) {
  const i = tamilSplit(children)
  if (i < 0) return <>{children}</>
  return (
    <>
      {children.slice(0, i)}
      <span className="ta"> {children.slice(i).trim()}</span>
    </>
  )
}
