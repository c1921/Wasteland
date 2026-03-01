import type { CombatSquad, CombatUnit } from "@/features/battle/types"
import type { CharacterCombatState } from "@/features/character/data/session-combat-state"
import type { Character } from "@/features/character/types"
import type { NpcSquadTemplate } from "@/features/map/types"

const ROUT_MORALE_THRESHOLD = 28

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function resolveMaxHp(character: Character) {
  return clamp(
    Math.round(
      70 + character.abilities.endurance * 0.8 + character.abilities.strength * 0.25
    ),
    60,
    150
  )
}

function resolveMorale(character: Character) {
  return clamp(
    Math.round(
      55 +
        character.skills.survival * 1.2 +
        character.skills.negotiation * 0.8 +
        character.abilities.intelligence * 0.15
    ),
    35,
    100
  )
}

function resolveFirepower(character: Character) {
  return clamp(
    Math.round(
      8 +
        character.skills.shooting * 0.35 +
        character.abilities.strength * 0.15 +
        character.skills.melee * 0.1
    ),
    8,
    26
  )
}

function resolveAccuracy(character: Character) {
  return clamp(
    Math.round(
      35 +
        character.skills.shooting * 2 +
        character.abilities.agility * 0.2 +
        character.skills.scouting * 0.5
    ),
    25,
    95
  )
}

function resolveDefense(character: Character) {
  return clamp(
    Math.round(
      8 + character.abilities.endurance * 0.12 + character.skills.melee * 0.3
    ),
    6,
    30
  )
}

function resolveManeuver(character: Character) {
  return clamp(
    Math.round(
      20 +
        character.abilities.agility * 0.5 +
        character.skills.stealth * 0.8 +
        character.skills.scouting * 0.7
    ),
    20,
    95
  )
}

export function mapCharacterToCombatUnit(
  character: Character,
  combatState?: CharacterCombatState
): CombatUnit {
  const maxHp = Math.max(1, Math.round(combatState?.maxHp ?? resolveMaxHp(character)))
  const hp = clamp(Math.round(combatState?.hp ?? maxHp), 0, maxHp)
  const morale = clamp(Math.round(combatState?.morale ?? resolveMorale(character)), 0, 100)
  const alive = combatState ? combatState.alive && hp > 0 : hp > 0
  const routing = combatState ? (!alive ? true : combatState.routing) : morale <= ROUT_MORALE_THRESHOLD

  return {
    id: character.id,
    name: character.name,
    maxHp,
    hp: alive ? hp : 0,
    morale,
    alive,
    routing,
    stats: {
      firepower: resolveFirepower(character),
      accuracy: resolveAccuracy(character),
      defense: resolveDefense(character),
      maneuver: resolveManeuver(character),
    },
  }
}

function buildCombatSquad({
  id,
  name,
  side,
  units,
}: {
  id: string
  name: string
  side: "A" | "B"
  units: CombatUnit[]
}): CombatSquad {
  return {
    id,
    name,
    side,
    units,
    cohesion: 100,
    suppression: 0,
    fireAdvantage: 0,
    initialUnitCount: units.length,
  }
}

export function buildPlayerCombatSquadFromCharacters(
  characters: Character[],
  combatStatesById: Record<string, CharacterCombatState> = {},
  name = "玩家队伍"
) {
  const units = characters.map((character) =>
    mapCharacterToCombatUnit(character, combatStatesById[character.id])
  )

  return buildCombatSquad({
    id: "player-team",
    name,
    side: "A",
    units,
  })
}

export function buildEnemyCombatSquadFromNpcTemplate(
  template: Pick<NpcSquadTemplate, "id" | "name" | "members">,
  combatStatesById: Record<string, CharacterCombatState> = {}
) {
  const units = template.members.map((character) =>
    mapCharacterToCombatUnit(character, combatStatesById[character.id])
  )

  return buildCombatSquad({
    id: template.id,
    name: template.name,
    side: "B",
    units,
  })
}
