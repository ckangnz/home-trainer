export interface WeightEntry {
  date: string
  kg: number
  updatedAt: string
}

export const KG_RANGE: readonly [number, number] = [20, 400]
