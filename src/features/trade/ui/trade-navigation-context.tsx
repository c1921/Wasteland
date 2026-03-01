import type { ReactNode } from "react"

import {
  TradeNavigationContext,
  type TradeNavigationContextValue,
} from "@/features/trade/ui/trade-navigation-store"

export function TradeNavigationProvider({
  value,
  children,
}: {
  value: TradeNavigationContextValue
  children: ReactNode
}) {
  return (
    <TradeNavigationContext.Provider value={value}>
      {children}
    </TradeNavigationContext.Provider>
  )
}
