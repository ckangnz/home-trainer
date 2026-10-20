import type { Category } from '@/exercises/types'

export type HealthActivity =
  | 'hiit'
  | 'functionalStrength'
  | 'traditionalStrength'
  | 'coreTraining'
  | 'flexibility'
  | 'yoga'
  | 'recovery'

export const APPLE_ACTIVITY: Record<HealthActivity, string> = {
  hiit: 'High Intensity Interval Training',
  functionalStrength: 'Functional Strength Training',
  traditionalStrength: 'Traditional Strength Training',
  coreTraining: 'Core Training',
  flexibility: 'Flexibility',
  yoga: 'Yoga',
  recovery: 'Preparation and Recovery',
}

export const HEALTH_CONNECT_ACTIVITY: Record<HealthActivity, string> = {
  hiit: 'HIGH_INTENSITY_INTERVAL_TRAINING',
  functionalStrength: 'CALISTHENICS',
  traditionalStrength: 'STRENGTH_TRAINING',
  coreTraining: 'CALISTHENICS',
  flexibility: 'STRETCHING',
  yoga: 'YOGA',
  recovery: 'STRETCHING',
}

export interface ActivityPart {
  category: Category
  ms: number
}

type Group = 'stretch' | 'yoga' | 'recovery' | 'cardio' | 'weights' | 'core' | 'strength'

const GROUP: Record<Category, Group> = {
  stretch: 'stretch',
  mobility: 'stretch',
  warmup: 'stretch',
  yoga: 'yoga',
  recovery: 'recovery',
  cardio: 'cardio',
  weights: 'weights',
  core: 'core',
  upperBody: 'strength',
  lowerBody: 'strength',
  fullBody: 'strength',
}

export function activityFor(parts: readonly ActivityPart[], cooldown = false): HealthActivity {
  if (cooldown) {
    return 'flexibility'
  }
  const totals: Record<Group, number> = { stretch: 0, yoga: 0, recovery: 0, cardio: 0, weights: 0, core: 0, strength: 0 }
  for (const part of parts) {
    totals[GROUP[part.category]] += Math.max(0, part.ms)
  }
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
  if (total === 0) {
    return 'functionalStrength'
  }
  const share = (group: Group) => totals[group] / total
  const gentle = share('stretch') + share('yoga') + share('recovery')
  if (gentle >= 0.7) {
    if (totals.yoga >= totals.stretch && totals.yoga >= totals.recovery) {
      return 'yoga'
    }
    return totals.recovery > totals.stretch ? 'recovery' : 'flexibility'
  }
  if (share('cardio') >= 0.5) {
    return 'hiit'
  }
  if (share('weights') >= 0.4) {
    return 'traditionalStrength'
  }
  if (share('core') >= 0.6) {
    return 'coreTraining'
  }
  if (share('cardio') >= 0.3) {
    return 'hiit'
  }
  return 'functionalStrength'
}
