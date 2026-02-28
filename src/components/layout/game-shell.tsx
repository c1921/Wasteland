import {
  lazy,
  Suspense,
  useState,
  type ComponentType,
} from "react"

import { SidebarNav } from "@/components/layout/sidebar-nav"
import { TopTimeBar } from "@/components/layout/top-time-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPanel } from "@/features/map/ui/map-panel"
import {
  NAV_ITEMS,
  type NavKey,
} from "@/types/navigation"

const TeamPanel = lazy(async () => ({
  default: (await import("@/components/panels/team-panel")).TeamPanel,
}))
const EventsPanel = lazy(async () => ({
  default: (await import("@/components/panels/events-panel")).EventsPanel,
}))
const BasePanel = lazy(async () => ({
  default: (await import("@/components/panels/base-panel")).BasePanel,
}))
const BattlePanel = lazy(async () => ({
  default: (await import("@/components/panels/battle-panel")).BattlePanel,
}))
const ItemsPanel = lazy(async () => ({
  default: (await import("@/components/panels/items-panel")).ItemsPanel,
}))
const SettingsPanel = lazy(async () => ({
  default: (await import("@/components/panels/settings-panel")).SettingsPanel,
}))

const navTitleMap: Record<NavKey, string> = {
  map: "地图",
  team: "队伍",
  events: "事件",
  base: "基地",
  battle: "战斗",
  items: "物品",
  settings: "设置",
}

const panelRegistry: Record<NavKey, ComponentType> = {
  map: MapPanel,
  team: TeamPanel,
  events: EventsPanel,
  base: BasePanel,
  battle: BattlePanel,
  items: ItemsPanel,
  settings: SettingsPanel,
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

function PanelFallback({ activeNav }: ActivePanelProps) {
  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="rounded-lg border bg-card p-4 md:p-5">
        <span className="sr-only">{navTitleMap[activeNav]}加载中</span>
        <div className="grid gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="pt-1">
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </section>
  )
}

function ActivePanel({ activeNav }: ActivePanelProps) {
  const PanelComponent = panelRegistry[activeNav] ?? MapPanel

  if (activeNav === "map") {
    return <MapPanel />
  }

  return (
    <Suspense fallback={<PanelFallback activeNav={activeNav} />}>
      <PanelComponent />
    </Suspense>
  )
}
