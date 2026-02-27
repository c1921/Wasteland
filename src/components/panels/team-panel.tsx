import { useMemo } from "react"

import { CharacterRoster } from "@/components/panels/character-roster"
import { PanelShell } from "@/components/panels/panel-shell"
import { getCharacters } from "@/features/character/data/characters"

export function TeamPanel() {
  const characters = useMemo(() => getCharacters(), [])

  return (
    <PanelShell title="队伍" description="查看队伍成员的基础信息与作战能力。">
      <CharacterRoster characters={characters} />
    </PanelShell>
  )
}
