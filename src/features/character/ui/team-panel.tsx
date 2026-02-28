import { useMemo } from "react"

import { getCharacters } from "@/features/character/data/characters"
import { CharacterRoster } from "@/features/character/ui/character-roster"
import { PanelShell } from "@/shared/ui/panel-shell"

export function TeamPanel() {
  const characters = useMemo(() => getCharacters(), [])

  return (
    <PanelShell title="队伍" description="查看队伍成员的基础信息与作战能力。">
      <CharacterRoster characters={characters} />
    </PanelShell>
  )
}
