import { useMemo, useState } from 'react'
import { Dialog } from '@/components/Dialog'
import { formatDuration } from '@/workouts/steps'
import { useToast } from '@/app/Toast'
import { Icon } from '@/app/Icons'
import { SHORTCUT_NAME, appleWorkoutType, buildTcx, detectPlatform, exportFileName, shortcutUrl, type HealthWorkout } from './export'
import './health.css'

const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

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
  const { notify } = useToast()
  const [setup, setSetup] = useState(false)
  const platform = useMemo(
    () => (typeof navigator === 'undefined' ? 'other' : detectPlatform(navigator.userAgent, navigator.maxTouchPoints)),
    [],
  )
  const fileName = exportFileName(workout)

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
    notify('Workout file downloaded')
  }

  const apple = (
    <section className="health-option stack stack--tight">
      <h3 className="health-option__title">
        <Icon name="heart" />
        Apple Health
      </h3>
      <p className="faint">Logs a {appleWorkoutType(workout.category)} workout with its start time, duration, and active calories using the free Shortcuts app.</p>
      <a className="btn btn--primary" href={shortcutUrl(workout)}>
        <Icon name="heart" />
        Send to Apple Health
      </a>
      <button type="button" className="btn btn--ghost btn--small" aria-expanded={setup} onClick={() => setSetup((value) => !value)}>
        {setup ? 'Hide setup' : 'First time? Set up the shortcut'}
      </button>
      {setup ? (
        <ol className="health-steps">
          <li>
            Open <strong>Shortcuts</strong>, tap <strong>+</strong>, and name the shortcut <strong>{SHORTCUT_NAME}</strong>.
          </li>
          <li>
            Add <strong>Get Dictionary from Input</strong> and pick <strong>Shortcut Input</strong>.
          </li>
          <li>
            Add <strong>Get Dictionary Value</strong> three times for the keys <code>startLocal</code>, <code>durationMinutes</code>, and{' '}
            <code>activeCalories</code>.
          </li>
          <li>
            Add <strong>Log Workout</strong>. Choose a type, then set Date to <code>startLocal</code>, Duration to <code>durationMinutes</code>{' '}
            minutes, and Calories to <code>activeCalories</code> kcal.
          </li>
          <li>
            Allow Shortcuts to write workouts: <strong>Settings › Health › Data Access &amp; Devices › Shortcuts</strong>.
          </li>
        </ol>
      ) : null}
    </section>
  )

  const file = (
    <section className="health-option stack stack--tight">
      <h3 className="health-option__title">
        <Icon name="download" />
        {platform === 'android' ? 'Health Connect, Strava, and more' : 'Workout file (.tcx)'}
      </h3>
      <p className="faint">
        {platform === 'android'
          ? 'Share the workout file to an app that syncs with Health Connect, such as Health Sync or Strava. Browsers cannot write to Health Connect directly.'
          : 'A standard workout file with the start time, duration, and calories. Import it into Strava, Garmin Connect, or a Health sync app.'}
      </p>
      <button type="button" className={`btn${platform === 'android' ? ' btn--primary' : ''}`} onClick={() => void shareFile()}>
        <Icon name={platform === 'android' ? 'share' : 'download'} />
        {platform === 'android' ? 'Share workout file' : 'Download .tcx'}
      </button>
    </section>
  )

  return (
    <Dialog open={open} title="Save to Health" onClose={onClose}>
      <dl className="health-summary">
        <div>
          <dt>Start</dt>
          <dd>{TIME.format(new Date(workout.startedAt))}</dd>
        </div>
        <div>
          <dt>End</dt>
          <dd>{TIME.format(new Date(workout.endedAt))}</dd>
        </div>
        <div>
          <dt>Active</dt>
          <dd>{formatDuration(workout.activeMs)}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{workout.calories} kcal</dd>
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
      <p className="faint health-note">Calories are an estimate based on exercise type, time, and the body weight in Settings.</p>
    </Dialog>
  )
}
