import { useMemo } from 'react'
import { getKorean } from './bundle'
import { isMessage, type Message } from './catalog'
import { EN, type MessageKey } from './en'
import { localeFor, useLanguage } from './language'
import type { Language } from './types'

export type Params = Record<string, string | number>

export type TFunction = (key: MessageKey, params?: Params) => string

function lookup(catalog: unknown, key: string): Message | undefined {
  let node = catalog
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined
    }
    node = (node as Record<string, unknown>)[part]
  }
  return isMessage(node) ? node : undefined
}

export function interpolate(template: string, params?: Params): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

const pluralRules = new Map<Language, Intl.PluralRules>()

export function pluralCategory(language: Language, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(language)
  if (!rules) {
    rules = new Intl.PluralRules(localeFor(language))
    pluralRules.set(language, rules)
  }
  return rules.select(count)
}

export function translate(language: Language, key: MessageKey, params?: Params): string {
  const localized = language === 'ko' ? lookup(getKorean()?.ui, key) : undefined
  const message = localized ?? lookup(EN, key)
  if (message === undefined) {
    return key
  }
  if (typeof message === 'string') {
    return interpolate(message, params)
  }
  const count = typeof params?.count === 'number' ? params.count : Number(params?.count ?? 0)
  const form = pluralCategory(language, count) === 'one' ? message.one : message.other
  return interpolate(form, params)
}

const translators = new Map<Language, TFunction>()

export function translator(language: Language): TFunction {
  let t = translators.get(language)
  if (!t) {
    t = (key, params) => translate(language, key, params)
    translators.set(language, t)
  }
  return t
}

export function useT(): TFunction {
  const language = useLanguage()
  return useMemo(() => translator(language), [language])
}
