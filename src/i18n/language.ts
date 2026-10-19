import { useEffect, useSyncExternalStore } from 'react'
import { getSettings, subscribeSettings, type LanguagePreference } from '@/settings/settings'
import { getKorean, loadKorean, subscribeKorean } from './bundle'
import type { Language } from './types'

export function browserLanguage(): string {
  return typeof navigator === 'undefined' ? '' : (navigator.language ?? '')
}

export function resolveLanguage(preference: LanguagePreference, browser: string = browserLanguage()): Language {
  if (preference === 'auto') {
    return browser.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  }
  return preference
}

export function preferredLanguage(): Language {
  return resolveLanguage(getSettings().language)
}

export function getLanguage(): Language {
  return preferredLanguage() === 'ko' && getKorean() !== null ? 'ko' : 'en'
}

function subscribe(listener: () => void): () => void {
  const offSettings = subscribeSettings(listener)
  const offKorean = subscribeKorean(listener)
  return () => {
    offSettings()
    offKorean()
  }
}

const serverLanguage = (): Language => 'en'

export function usePreferredLanguage(): Language {
  return useSyncExternalStore(subscribeSettings, preferredLanguage, serverLanguage)
}

export function useLanguage(): Language {
  const preferred = usePreferredLanguage()
  const language = useSyncExternalStore(subscribe, getLanguage, serverLanguage)
  useEffect(() => {
    if (preferred === 'ko') {
      void loadKorean().catch(() => undefined)
    }
  }, [preferred])
  return language
}

export function localeFor(language: Language): string {
  if (language === 'ko') {
    return 'ko-KR'
  }
  const browser = browserLanguage()
  return browser.toLowerCase().startsWith('en') ? browser : 'en'
}

export function LanguageSync(): null {
  const language = useLanguage()
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return null
}
