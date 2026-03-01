import { useMemo } from "react"

import { getCharacters } from "@/features/character/data/characters"
import { CharacterRoster } from "@/features/character/ui/character-roster"
import { PanelShell } from "@/shared/ui/panel-shell"

export function TeamPanel() {
  const characters = useMemo(() => getCharacters(), [])

  return (
    <PanelShell>
      <CharacterRoster characters={characters} />
    </PanelShell>
  )
}
