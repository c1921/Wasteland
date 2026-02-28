import { useState } from "react"

import { SidebarNav } from "@/components/layout/sidebar-nav"
import { TopTimeBar } from "@/components/layout/top-time-bar"
import { BasePanel } from "@/components/panels/base-panel"
import { BattlePanel } from "@/components/panels/battle-panel"
import { EventsPanel } from "@/components/panels/events-panel"
import { MapPanel } from "@/features/map/ui/map-panel"
import { ItemsPanel } from "@/components/panels/items-panel"
import { SettingsPanel } from "@/components/panels/settings-panel"
import { TeamPanel } from "@/components/panels/team-panel"
import {
  NAV_ITEMS,
  type NavKey,
} from "@/types/navigation"

const navTitleMap: Record<NavKey, string> = {
  map: "地图",
  team: "队伍",
  events: "事件",
  base: "基地",
  battle: "战斗",
  items: "物品",
  settings: "设置",
}

export function GameShell() {
  const [activeNav, setActiveNav] = useState<NavKey>("map")
  const isMapPage = activeNav === "map"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarNav
        items={NAV_ITEMS}
        activeNav={activeNav}
        onChange={setActiveNav}
      />
      <main className={isMapPage ? "ml-14 flex h-screen flex-col overflow-hidden" : "ml-14 flex min-h-screen flex-col"}>
        <TopTimeBar />
        <div className={isMapPage ? "min-h-0 flex-1" : "min-h-0 flex-1 p-4 md:p-6"}>
          {isMapPage ? null : (
            <header className="mb-6 flex items-center justify-between border-b pb-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Wasteland Control
              </p>
              <p className="text-xs text-muted-foreground">
                当前面板: {navTitleMap[activeNav]}
              </p>
            </header>
          )}
          <ActivePanel activeNav={activeNav} />
        </div>
      </main>
    </div>
  )
}

type ActivePanelProps = {
  activeNav: NavKey
}

function ActivePanel({ activeNav }: ActivePanelProps) {
  switch (activeNav) {
    case "map":
      return <MapPanel />
    case "team":
      return <TeamPanel />
    case "events":
      return <EventsPanel />
    case "base":
      return <BasePanel />
    case "battle":
      return <BattlePanel />
    case "items":
      return <ItemsPanel />
    case "settings":
      return <SettingsPanel />
    default:
      return <MapPanel />
  }
}
