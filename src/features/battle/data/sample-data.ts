import type { CombatSquad, CombatUnit } from "@/features/battle/types"

type UnitSeed = {
  id: string
  name: string
  hp: number
  morale: number
  firepower: number
  accuracy: number
  defense: number
  maneuver: number
}

type SquadSeed = {
  id: string
  name: string
  side: "A" | "B"
  units: UnitSeed[]
}

const SAMPLE_SQUADS: [SquadSeed, SquadSeed] = [
  {
    id: "sample-squad-a",
    name: "灰狼突击队",
    side: "A",
    units: [
      {
        id: "a-1",
        name: "灰狼-1",
        hp: 108,
        morale: 82,
        firepower: 17,
        accuracy: 68,
        defense: 12,
        maneuver: 66,
      },
      {
        id: "a-2",
        name: "灰狼-2",
        hp: 100,
        morale: 78,
        firepower: 16,
        accuracy: 64,
        defense: 14,
        maneuver: 61,
      },
      {
        id: "a-3",
        name: "灰狼-3",
        hp: 96,
        morale: 80,
        firepower: 15,
        accuracy: 62,
        defense: 13,
        maneuver: 58,
      },
      {
        id: "a-4",
        name: "灰狼-4",
        hp: 92,
        morale: 76,
        firepower: 15,
        accuracy: 60,
        defense: 12,
        maneuver: 57,
      },
      {
        id: "a-5",
        name: "灰狼-5",
        hp: 88,
        morale: 74,
        firepower: 14,
        accuracy: 58,
        defense: 12,
        maneuver: 55,
      },
    ],
  },
  {
    id: "sample-squad-b",
    name: "锈钉防卫组",
    side: "B",
    units: [
      {
        id: "b-1",
        name: "锈钉-1",
        hp: 112,
        morale: 84,
        firepower: 16,
        accuracy: 62,
        defense: 15,
        maneuver: 52,
      },
      {
        id: "b-2",
        name: "锈钉-2",
        hp: 102,
        morale: 80,
        firepower: 15,
        accuracy: 61,
        defense: 16,
        maneuver: 50,
      },
      {
        id: "b-3",
        name: "锈钉-3",
        hp: 98,
        morale: 77,
        firepower: 15,
        accuracy: 59,
        defense: 15,
        maneuver: 49,
      },
      {
        id: "b-4",
        name: "锈钉-4",
        hp: 92,
        morale: 75,
        firepower: 14,
        accuracy: 57,
        defense: 14,
        maneuver: 48,
      },
      {
        id: "b-5",
        name: "锈钉-5",
        hp: 90,
        morale: 72,
        firepower: 13,
        accuracy: 55,
        defense: 14,
        maneuver: 47,
      },
    ],
  },
]

function toUnit(seed: UnitSeed): CombatUnit {
  return {
    id: seed.id,
    name: seed.name,
    maxHp: seed.hp,
    hp: seed.hp,
    morale: seed.morale,
    alive: true,
    routing: false,
    stats: {
      firepower: seed.firepower,
      accuracy: seed.accuracy,
      defense: seed.defense,
      maneuver: seed.maneuver,
    },
  }
}

function toSquad(seed: SquadSeed): CombatSquad {
  const units = seed.units.map(toUnit)

  return {
    id: seed.id,
    name: seed.name,
    side: seed.side,
    units,
    cohesion: 100,
    suppression: 0,
    fireAdvantage: 0,
    initialUnitCount: units.length,
  }
}

export function createSampleBattleSquads(): [CombatSquad, CombatSquad] {
  return [toSquad(SAMPLE_SQUADS[0]), toSquad(SAMPLE_SQUADS[1])]
}

export function createSampleBattleStateId() {
  return `battle-${Date.now()}`
}
