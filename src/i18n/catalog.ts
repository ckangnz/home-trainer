export interface Plural {
  one: string
  other: string
}

export type Message = string | Plural

export type Catalog<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Message : Catalog<T[K]>
}

export type KeyPaths<T> = {
  [K in keyof T & string]: T[K] extends Message ? K : `${K}.${KeyPaths<T[K]>}`
}[keyof T & string]

export function isMessage(value: unknown): value is Message {
  return typeof value === 'string' || (typeof value === 'object' && value !== null && 'other' in value && typeof (value as Plural).other === 'string')
}

export function messageKeys(catalog: object, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    isMessage(value) ? [`${prefix}${key}`] : messageKeys(value as object, `${prefix}${key}.`),
  )
}
