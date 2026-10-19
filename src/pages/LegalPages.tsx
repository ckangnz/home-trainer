import { usePageMeta } from '@/app/meta'
import { SITE } from '@/app/site'
import { useLanguage, useT } from '@/i18n'

const UPDATED = 'October 18, 2026'

function EnglishOnlyNote() {
  const language = useLanguage()
  const t = useT()
  return language === 'en' ? null : (
    <p className="notice" lang={language}>
      {t('publicPages.legal.englishOnly')}
    </p>
  )
}

function Contact() {
  return SITE.contactEmail ? (
    <p>
      Questions? Email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
    </p>
  ) : null
}

export function PrivacyPage() {
  usePageMeta('Privacy policy', `How ${SITE.name} handles your data, cookies, and advertising.`)
  return (
    <article className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">Privacy policy</h1>
        <p className="faint">Last updated {UPDATED}</p>
      </header>
      <EnglishOnlyNote />
      <div className="prose">
        <p>
          {SITE.name} is a free workout app that runs in your browser. This policy explains what we collect, why, and the
          choices you have.
        </p>
        <h2>Information we store</h2>
        <ul>
          <li>
            <strong>Account:</strong> when you sign in with Google we receive your name, email address, profile photo, and
            a unique account ID from Google through Firebase Authentication.
          </li>
          <li>
            <strong>Your content:</strong> routines you create or import and your workout history (date, duration, and
            which workout you did) are stored in Google Cloud Firestore under your account.
          </li>
          <li>
            <strong>Shared workouts:</strong> when you share a workout we store a copy of it under a short code. Anyone
            with the code or link can view and copy that routine. It does not include your name or email.
          </li>
          <li>
            <strong>On your device:</strong> coaching preferences such as voice and sound settings are saved in your
            browser&apos;s local storage, and workouts you have opened are cached so they work offline.
          </li>
        </ul>
        <p>We do not sell your personal information and we do not collect health or medical data.</p>

        <h2>Advertising and cookies</h2>
        <p>
          {SITE.name} is funded by ads served by Google AdSense. Third-party vendors, including Google, use cookies to serve
          ads based on your prior visits to this and other websites. Google&apos;s use of advertising cookies enables it
          and its partners to serve ads to you based on your visits to this site and other sites on the internet.
        </p>
        <ul>
          <li>
            You can opt out of personalized advertising in{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">
              Google Ads Settings
            </a>
            , or opt out of some third-party vendors&apos; use of cookies at{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">
              aboutads.info
            </a>
            .
          </li>
          <li>
            Learn how Google uses information from sites that use its services at{' '}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">
              policies.google.com/technologies/partner-sites
            </a>
            .
          </li>
          <li>
            Visitors in the European Economic Area, the United Kingdom, and Switzerland are asked for consent through a
            Google-certified consent message before personalized ads are shown.
          </li>
        </ul>

        <h2>Deleting your data</h2>
        <p>
          You can delete any routine or history entry in the app at any time. To delete your whole account and all
          associated data, contact us and we will remove it.
        </p>

        <h2>Children</h2>
        <p>{SITE.name} is not directed to children under 13 and we do not knowingly collect their personal information.</p>

        <h2>Changes</h2>
        <p>We will update this page if our practices change and revise the date above.</p>
        <Contact />
      </div>
    </article>
  )
}

export function TermsPage() {
  usePageMeta('Terms of use', `The terms for using ${SITE.name}, including exercise safety, your account, and ads.`)
  return (
    <article className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">Terms of use</h1>
        <p className="faint">Last updated {UPDATED}</p>
      </header>
      <EnglishOnlyNote />
      <div className="prose">
        <h2>Exercise safely</h2>
        <p>
          {SITE.name} provides general fitness information, not medical advice. Talk to a doctor before starting a new
          exercise program, especially if you are pregnant, injured, or have a medical condition. Stop exercising if you
          feel pain, dizziness, or shortness of breath. You exercise at your own risk.
        </p>
        <h2>Your account</h2>
        <p>
          You are responsible for activity on your account. Do not use {SITE.name} to share unlawful, harmful, or offensive
          content in routine names or descriptions. We may remove shared routines that break these terms.
        </p>
        <h2>The service</h2>
        <p>
          {SITE.name} is offered free of charge and as is. Features may change, and we cannot guarantee the service will
          always be available or free of errors.
        </p>
        <h2>Ads</h2>
        <p>The app shows ads on some rest and content screens. Ads are provided by Google and are subject to its policies.</p>
        <Contact />
      </div>
    </article>
  )
}
