import type { KeyPaths } from './catalog'
import { app } from './en/app'
import { awards } from './en/awards'
import { common } from './en/common'
import { player } from './en/player'
import { publicPages } from './en/publicPages'
import { settings } from './en/settings'
import { shell } from './en/shell'
import { social } from './en/social'
import { units } from './en/units'

export const EN = { common, units, shell, settings, publicPages, app, social, player, awards }

export type UiMessages = typeof EN

export type MessageKey = KeyPaths<UiMessages>
