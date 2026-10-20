import { APPLE_ACTIVITY, HEALTH_CONNECT_ACTIVITY, type HealthActivity } from './activity'

export interface HealthWorkout {
  title: string
  startedAt: string
  endedAt: string
  activeMs: number
  calories: number
  activity: HealthActivity
  exercises: number
}

export const SHORTCUT_NAME = 'HomeTrainer to Health'

const INSTALL_URL = import.meta.env.VITE_HEALTH_SHORTCUT_URL?.trim() ?? ''

export const SHORTCUT_INSTALL_URL = /^https:\/\/www\.icloud\.com\/shortcuts\/[0-9a-f]+/i.test(INSTALL_URL) ? INSTALL_URL : ''

export function appleWorkoutType(activity: HealthActivity): string {
  return APPLE_ACTIVITY[activity]
}

export function healthConnectType(activity: HealthActivity): string {
  return HEALTH_CONNECT_ACTIVITY[activity]
}

function localStamp(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function healthPayload(workout: HealthWorkout): Record<string, string | number> {
  return {
    name: workout.title,
    type: appleWorkoutType(workout.activity),
    healthConnectType: healthConnectType(workout.activity),
    start: workout.startedAt,
    end: workout.endedAt,
    startLocal: localStamp(workout.startedAt),
    endLocal: localStamp(workout.endedAt),
    durationMinutes: Math.max(1, Math.round(workout.activeMs / 60000)),
    activeCalories: workout.calories,
    exercises: workout.exercises,
    source: 'HomeTrainer',
  }
}

export function shortcutUrl(workout: HealthWorkout): string {
  const params = new URLSearchParams({ name: SHORTCUT_NAME, input: 'text', text: JSON.stringify(healthPayload(workout)) })
  return `shortcuts://run-shortcut?${params.toString().replace(/\+/g, '%20')}`
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (character) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[character]};`)
}

export function buildTcx(workout: HealthWorkout): string {
  const seconds = Math.max(1, Math.round(workout.activeMs / 1000))
  const start = new Date(workout.startedAt).toISOString()
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">',
    '  <Activities>',
    '    <Activity Sport="Other">',
    `      <Id>${start}</Id>`,
    `      <Lap StartTime="${start}">`,
    `        <TotalTimeSeconds>${seconds}</TotalTimeSeconds>`,
    '        <DistanceMeters>0</DistanceMeters>',
    `        <Calories>${Math.max(0, Math.round(workout.calories))}</Calories>`,
    '        <Intensity>Active</Intensity>',
    '        <TriggerMethod>Manual</TriggerMethod>',
    '      </Lap>',
    `      <Notes>${escapeXml(`${workout.title} · ${appleWorkoutType(workout.activity)} · ${workout.exercises} exercises · HomeTrainer`)}</Notes>`,
    '    </Activity>',
    '  </Activities>',
    '</TrainingCenterDatabase>',
    '',
  ].join('\n')
}

export function exportFileName(workout: HealthWorkout): string {
  const date = new Date(workout.startedAt)
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const slug = workout.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'workout'
  return `hometrainer-${stamp}-${slug}.tcx`
}
