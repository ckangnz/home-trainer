export const SITE = {
  name: 'HomeTrainer',
  tagline: 'Free 7-minute workouts with animated guides',
  description:
    'HomeTrainer is a free 7-minute workout app that runs in your browser. Follow animated exercise guides, build your own routines, and share them with a code. No download, no subscription.',
  url: (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL ?? '',
  supportUrl: /^https:\/\//.test(import.meta.env.VITE_SUPPORT_URL ?? '') ? (import.meta.env.VITE_SUPPORT_URL as string) : '',
}

export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

export function absoluteUrl(path: string): string {
  const origin = SITE.url || (typeof window === 'undefined' ? '' : `${window.location.origin}${BASE_PATH}`)
  return `${origin}${path}`
}
