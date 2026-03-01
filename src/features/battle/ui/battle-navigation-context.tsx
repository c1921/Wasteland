import type { ReactNode } from "react"

import {
  BattleNavigationContext,
  type BattleNavigationContextValue,
} from "@/features/battle/ui/battle-navigation-store"

export function BattleNavigationProvider({
  value,
  children,
}: {
  value: BattleNavigationContextValue
  children: ReactNode
}) {
  return (
    <BattleNavigationContext.Provider value={value}>
      {children}
    </BattleNavigationContext.Provider>
  )
}
