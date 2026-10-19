import { useMemo, useState } from 'react'
import { Dialog } from '@/components/Dialog'
import { useToast } from '@/app/Toast'
import { Icon } from '@/app/Icons'
import { detectPlatform } from '@/app/platform'
import { useFormat, useT } from '@/i18n'
import { richText } from '@/i18n/richText'
import { SHORTCUT_INSTALL_URL, SHORTCUT_NAME, appleWorkoutType, buildTcx, exportFileName, shortcutUrl, type HealthWorkout } from './export'
import './health.css'

const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }

function download(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/vnd.garmin.tcx+xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function HealthExportDialog({ workout, open, onClose }: { workout: HealthWorkout; open: boolean; onClose: () => void }) {
  const t = useT()
  const fmt = useFormat()
  const { notify } = useToast()
  const [setup, setSetup] = useState(false)
  const platform = useMemo(
    () => (typeof navigator === 'undefined' ? 'other' : detectPlatform(navigator.userAgent, navigator.maxTouchPoints)),
    [],
  )
  const fileName = exportFileName(workout)
  const keys = {
    startLocal: <code>startLocal</code>,
    durationMinutes: <code>durationMinutes</code>,
    activeCalories: <code>activeCalories</code>,
  }

  const shareFile = async () => {
    const contents = buildTcx(workout)
    const file = typeof File === 'function' ? new File([contents], fileName, { type: 'application/vnd.garmin.tcx+xml' }) : null
    if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: workout.title })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }
    download(fileName, contents)
    notify(t('social.health.downloaded'))
  }

  const apple = (
    <section className="health-option stack stack--tight">
      <h3 className="health-option__title">
        <Icon name="heart" />
        {t('social.health.appleHealth')}
      </h3>
      <p className="faint">{t('social.health.appleExplain', { type: appleWorkoutType(workout.category) })}</p>
      <a className="btn btn--primary" href={shortcutUrl(workout)}>
        <Icon name="heart" />
        {t('social.health.sendToApple')}
      </a>
      {SHORTCUT_INSTALL_URL ? (
        <a className="btn btn--small" href={SHORTCUT_INSTALL_URL} target="_blank" rel="noreferrer">
          <Icon name="download" />
          {t('social.health.getShortcut')}
        </a>
      ) : null}
      <button type="button" className="btn btn--ghost btn--small" aria-expanded={setup} onClick={() => setSetup((value) => !value)}>
        {setup ? t('social.health.hideSetup') : SHORTCUT_INSTALL_URL ? t('social.health.buildYourself') : t('social.health.showSetup')}
      </button>
      {setup ? (
        <ol className="health-steps">
          <li>
            {richText(t('social.health.step1'), {
              shortcuts: <strong>{t('social.health.shortcuts')}</strong>,
              plus: <strong>+</strong>,
              name: <strong>{SHORTCUT_NAME}</strong>,
            })}
          </li>
          <li>
            {richText(t('social.health.step2'), {
              getDictionary: <strong>{t('social.health.getDictionary')}</strong>,
              shortcutInput: <strong>{t('social.health.shortcutInput')}</strong>,
            })}
          </li>
          <li>{richText(t('social.health.step3'), { getValue: <strong>{t('social.health.getValue')}</strong>, ...keys })}</li>
          <li>{richText(t('social.health.step4'), { logWorkout: <strong>{t('social.health.logWorkout')}</strong>, ...keys })}</li>
          <li>{richText(t('social.health.step5'), { path: <strong>{t('social.health.accessPath')}</strong> })}</li>
        </ol>
      ) : null}
    </section>
  )

  const file = (
    <section className="health-option stack stack--tight">
      <h3 className="health-option__title">
        <Icon name="download" />
        {platform === 'android' ? t('social.health.androidTitle') : t('social.health.fileTitle')}
      </h3>
      <p className="faint">
        {platform === 'android'
          ? t('social.health.androidExplain')
          : t('social.health.fileExplain')}
      </p>
      <button type="button" className={`btn${platform === 'android' ? ' btn--primary' : ''}`} onClick={() => void shareFile()}>
        <Icon name={platform === 'android' ? 'share' : 'download'} />
        {platform === 'android' ? t('social.health.shareFile') : t('social.health.download')}
      </button>
    </section>
  )

  return (
    <Dialog open={open} title={t('social.health.title')} onClose={onClose}>
      <dl className="health-summary">
        <div>
          <dt>{t('social.health.start')}</dt>
          <dd>{fmt.date(workout.startedAt, TIME_OPTIONS)}</dd>
        </div>
        <div>
          <dt>{t('social.health.end')}</dt>
          <dd>{fmt.date(workout.endedAt, TIME_OPTIONS)}</dd>
        </div>
        <div>
          <dt>{t('social.health.active')}</dt>
          <dd>{fmt.duration(workout.activeMs)}</dd>
        </div>
        <div>
          <dt>{t('social.health.calories')}</dt>
          <dd>{t('units.calories', { n: workout.calories })}</dd>
        </div>
      </dl>
      {platform === 'android' ? (
        <>
          {file}
          {apple}
        </>
      ) : (
        <>
          {apple}
          {file}
        </>
      )}
      <p className="faint health-note">{t('social.health.note')}</p>
    </Dialog>
  )
}
