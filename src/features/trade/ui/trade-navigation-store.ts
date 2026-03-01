import { createContext, useContext } from "react"

import type { TradeTargetRef } from "@/features/trade/types"

export type TradeNavigationContextValue = {
  selectedTarget: TradeTargetRef | null
  setSelectedTarget: (target: TradeTargetRef | null) => void
  requestOpenTrade: (target: TradeTargetRef | null) => void
}

const EMPTY_CONTEXT: TradeNavigationContextValue = {
  selectedTarget: null,
  setSelectedTarget: () => {},
  requestOpenTrade: () => {},
}

export const TradeNavigationContext =
  createContext<TradeNavigationContextValue>(EMPTY_CONTEXT)

export function useTradeNavigation() {
  return useContext(TradeNavigationContext)
}
