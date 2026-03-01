import {
  lazy,
  type ComponentType,
} from "react"

import type { NavKey } from "@/app/navigation/types"
import { MapPanel } from "@/features/map/ui/map-panel"

const TeamPanel = lazy(async () => ({
  default: (await import("@/features/character/ui/team-panel")).TeamPanel,
}))
const EventsPanel = lazy(async () => ({
  default: (await import("@/features/events/ui/events-panel")).EventsPanel,
}))
const BasePanel = lazy(async () => ({
  default: (await import("@/features/base/ui/base-panel")).BasePanel,
}))
const BattlePanel = lazy(async () => ({
  default: (await import("@/features/battle/ui/battle-panel")).BattlePanel,
}))
const ItemsPanel = lazy(async () => ({
  default: (await import("@/features/items/ui/items-panel")).ItemsPanel,
}))
const TradePanel = lazy(async () => ({
  default: (await import("@/features/trade/ui/trade-panel")).TradePanel,
}))
const SettingsPanel = lazy(async () => ({
  default: (await import("@/features/settings/ui/settings-panel")).SettingsPanel,
}))

export const PANEL_REGISTRY: Record<NavKey, ComponentType> = {
  map: MapPanel,
  team: TeamPanel,
  events: EventsPanel,
  base: BasePanel,
  battle: BattlePanel,
  items: ItemsPanel,
  trade: TradePanel,
  settings: SettingsPanel,
}
