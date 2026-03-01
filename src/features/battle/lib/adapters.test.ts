import { describe, expect, it } from "vitest"

import {
  buildEnemyCombatSquadFromNpcTemplate,
  buildPlayerCombatSquadFromCharacters,
  mapCharacterToCombatUnit,
} from "@/features/battle/lib/adapters"
import type { CharacterCombatState } from "@/features/character/data/session-combat-state"
import { Character, Gender, type CharacterProfile } from "@/features/character/types"

function createCharacter(overrides: Partial<CharacterProfile> = {}) {
  const abilities = {
    strength: 60,
    agility: 70,
    intelligence: 65,
    endurance: 58,
    ...overrides.abilities,
  }
  const skills = {
    shooting: 14,
    melee: 8,
    stealth: 12,
    scouting: 13,
    survival: 10,
    medical: 7,
    engineering: 9,
    salvaging: 11,
    driving: 6,
    negotiation: 5,
    taming: 4,
    crafting: 8,
    ...overrides.skills,
  }

  return new Character({
    id: overrides.id ?? "character-1",
    name: overrides.name ?? "灰烬旅人",
    gender: overrides.gender ?? Gender.Unknown,
    abilities,
    skills,
  })
}

describe("battle adapters", () => {
  it("maps character to bounded combat stats", () => {
    const elite = createCharacter({
      abilities: {
        strength: 100,
        agility: 100,
        intelligence: 100,
        endurance: 100,
      },
      skills: {
        shooting: 20,
        melee: 20,
        stealth: 20,
        scouting: 20,
        survival: 20,
        medical: 20,
        engineering: 20,
        salvaging: 20,
        driving: 20,
        negotiation: 20,
        taming: 20,
        crafting: 20,
      },
    })

    const unit = mapCharacterToCombatUnit(elite)
    expect(unit.maxHp).toBeLessThanOrEqual(150)
    expect(unit.stats.firepower).toBeLessThanOrEqual(26)
    expect(unit.stats.accuracy).toBeLessThanOrEqual(95)
    expect(unit.stats.defense).toBeLessThanOrEqual(30)
    expect(unit.stats.maneuver).toBeLessThanOrEqual(95)
  })

  it("uses session combat state when building player squad", () => {
    const character = createCharacter({ id: "player-1", name: "霜鸦" })
    const state: CharacterCombatState = {
      characterId: "player-1",
      maxHp: 120,
      hp: 44,
      morale: 35,
      alive: true,
      routing: true,
    }

    const squad = buildPlayerCombatSquadFromCharacters(
      [character],
      { "player-1": state },
      "测试玩家队伍"
    )

    expect(squad.side).toBe("A")
    expect(squad.name).toBe("测试玩家队伍")
    expect(squad.units[0]).toMatchObject({
      id: "player-1",
      hp: 44,
      morale: 35,
      routing: true,
    })
  })

  it("builds enemy squad from npc template members", () => {
    const enemyA = createCharacter({ id: "enemy-a", name: "锈钉-1" })
    const enemyB = createCharacter({ id: "enemy-b", name: "锈钉-2" })

    const squad = buildEnemyCombatSquadFromNpcTemplate({
      id: "npc-squad-1",
      name: "锈钉巡逻组",
      members: [enemyA, enemyB],
    })

    expect(squad.side).toBe("B")
    expect(squad.initialUnitCount).toBe(2)
    expect(squad.units.map((unit) => unit.id)).toEqual(["enemy-a", "enemy-b"])
  })
})
