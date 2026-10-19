import type { Catalog } from '../../catalog'
import type { units as en } from '../../en/units'

export const units = {
  sec: '{n}초',
  min: '{n}분',
  minSec: '{m}분 {s}초',
  hours: '{h}시간',
  hoursMin: '{h}시간 {m}분',
  reps: '{count}회',
  perSide: '한쪽당 {base}',
  kg: '{n}kg',
  moves: '동작 {count}개',
  exercises: '운동 {count}개',
  workouts: '운동 {count}회',
  rounds: '{count}라운드',
  sets: '{count}세트',
  days: '{count}일',
  calories: '{n}kcal',
} satisfies Catalog<typeof en>
