import { createContext, useContext } from "react"

import type { BattleEncounterRef } from "@/features/battle/types"

export type BattleNavigationContextValue = {
  selectedEncounter: BattleEncounterRef | null
  setSelectedEncounter: (encounter: BattleEncounterRef | null) => void
  requestOpenBattle: (encounter: BattleEncounterRef) => void
}

const EMPTY_CONTEXT: BattleNavigationContextValue = {
  selectedEncounter: null,
  setSelectedEncounter: () => {},
  requestOpenBattle: () => {},
}

export const BattleNavigationContext =
  createContext<BattleNavigationContextValue>(EMPTY_CONTEXT)

export function useBattleNavigation() {
  return useContext(BattleNavigationContext)
}
