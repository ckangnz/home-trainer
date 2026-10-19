import type { Catalog } from '../catalog'
import type { UiMessages } from '../en'
import { app } from './ui/app'
import { common } from './ui/common'
import { player } from './ui/player'
import { publicPages } from './ui/publicPages'
import { settings } from './ui/settings'
import { shell } from './ui/shell'
import { social } from './ui/social'
import { units } from './ui/units'

export const UI_KO: Catalog<UiMessages> = { common, units, shell, settings, publicPages, app, social, player }
