import { getLanguage } from '@/i18n/language'
import { translator } from '@/i18n/translate'

export function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : ''
}

export function describeAuthError(cause: unknown): string {
  const t = translator(getLanguage())
  switch (errorCode(cause)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return t('social.authErrors.canceled')
    case 'auth/network-request-failed':
      return t('social.authErrors.network')
    case 'auth/unauthorized-domain':
      return t('social.authErrors.domain')
    default:
      return t('social.authErrors.failed')
  }
}
