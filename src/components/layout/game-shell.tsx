import {
  Suspense,
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
                当前面板: {NAV_TITLE_MAP[activeNav]}
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
