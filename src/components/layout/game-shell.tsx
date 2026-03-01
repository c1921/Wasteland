import {
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react"

import {
  NAV_ITEMS,
  NAV_TITLE_MAP,
} from "@/app/navigation/nav-config"
import { PANEL_REGISTRY } from "@/app/navigation/panel-registry"
import type { NavKey } from "@/app/navigation/types"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { TopTimeBar } from "@/components/layout/top-time-bar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BattleNavigationProvider,
} from "@/features/battle/ui/battle-navigation-context"
import type { BattleEncounterRef } from "@/features/battle/types"
import {
  TradeNavigationProvider,
} from "@/features/trade/ui/trade-navigation-context"
import type { TradeTargetRef } from "@/features/trade/types"

export function GameShell() {
  const [activeNav, setActiveNav] = useState<NavKey>("map")
  const [selectedBattleEncounter, setSelectedBattleEncounter] =
    useState<BattleEncounterRef | null>(null)
  const [selectedTradeTarget, setSelectedTradeTarget] = useState<TradeTargetRef | null>(null)
  const requestOpenBattle = useCallback((encounter: BattleEncounterRef) => {
    setSelectedBattleEncounter(encounter)
    setActiveNav("battle")
  }, [])
  const requestOpenTrade = useCallback((target: TradeTargetRef | null) => {
    setSelectedTradeTarget(target)
    setActiveNav("trade")
  }, [])
  const battleNavigationContextValue = useMemo(
    () => ({
      selectedEncounter: selectedBattleEncounter,
      setSelectedEncounter: setSelectedBattleEncounter,
      requestOpenBattle,
    }),
    [requestOpenBattle, selectedBattleEncounter]
  )
  const tradeNavigationContextValue = useMemo(
    () => ({
      selectedTarget: selectedTradeTarget,
      setSelectedTarget: setSelectedTradeTarget,
      requestOpenTrade,
    }),
    [requestOpenTrade, selectedTradeTarget]
  )
  const isMapPage = activeNav === "map"

  return (
    <BattleNavigationProvider value={battleNavigationContextValue}>
      <TradeNavigationProvider value={tradeNavigationContextValue}>
        <div className="min-h-screen bg-background text-foreground">
          <SidebarNav
            items={NAV_ITEMS}
            activeNav={activeNav}
            onChange={setActiveNav}
          />
          <main
            className={
              isMapPage
                ? "ml-10 md:ml-14 flex h-screen flex-col overflow-hidden"
                : "ml-10 md:ml-14 flex min-h-screen flex-col"
            }
          >
            <TopTimeBar />
            <div
              className={
                isMapPage ? "min-h-0 flex-1" : "min-h-0 flex-1 p-2 md:p-6"
              }
            >
              <ActivePanel activeNav={activeNav} />
            </div>
          </main>
        </div>
      </TradeNavigationProvider>
    </BattleNavigationProvider>
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
        <span className="sr-only">{NAV_TITLE_MAP[activeNav]}加载中</span>
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
  const PanelComponent = PANEL_REGISTRY[activeNav]

  if (activeNav === "map") {
    return <PanelComponent />
  }

  return (
    <Suspense fallback={<PanelFallback activeNav={activeNav} />}>
      <PanelComponent />
    </Suspense>
  )
}
