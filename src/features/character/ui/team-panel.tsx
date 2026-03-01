import { useMemo } from "react"

import { getCharacters } from "@/features/character/data/characters"
import { getCombatStatesByCharacterIds } from "@/features/character/data/session-combat-state"
import { CharacterRoster } from "@/features/character/ui/character-roster"
import { PanelShell } from "@/shared/ui/panel-shell"

export function TeamPanel() {
  const characters = useMemo(() => getCharacters(), [])
  const combatStates = useMemo(() => {
    return getCombatStatesByCharacterIds(characters.map((character) => character.id))
  }, [characters])

  return (
    <PanelShell>
      <CharacterRoster characters={characters} combatStates={combatStates} />
    </PanelShell>
  )
}
