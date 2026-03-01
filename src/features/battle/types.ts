export const BATTLE_PHASES = [
  "contact",
  "fire-advantage",
  "maneuver",
  "rout",
  "pursuit",
  "ended",
] as const

export type BattlePhase = (typeof BATTLE_PHASES)[number]

export type BattleSide = "A" | "B"

export type UnitCombatStats = {
  firepower: number
  accuracy: number
  defense: number
  maneuver: number
}

export type CombatUnit = {
  id: string
  name: string
  maxHp: number
  hp: number
  morale: number
  alive: boolean
  routing: boolean
  stats: UnitCombatStats
}

export type CombatSquad = {
  id: string
  name: string
  side: BattleSide
  units: CombatUnit[]
  cohesion: number
  suppression: number
  fireAdvantage: number
  initialUnitCount: number
}

export type BattlePhaseMeta = {
  sinceTick: number
  contactEstablished: boolean
  contactScore: number
  fireGap: number
  maneuverPreparedBy: BattleSide | null
  routingSide: BattleSide | null
  pursuitTicks: number
  pursuitMaxTicks: number
}

export type BattleLogEntry = {
  tick: number
  phase: BattlePhase
  message: string
}

export type BattleState = {
  id: string
  phase: BattlePhase
  tickCount: number
  elapsedSec: number
  squads: [CombatSquad, CombatSquad]
  winnerSide: BattleSide | null
  log: BattleLogEntry[]
  phaseMeta: BattlePhaseMeta
}

export type PhaseHandler = {
  enter: (state: BattleState) => BattleState
  tick: (state: BattleState) => BattleState
  exit: (state: BattleState) => BattleState
}

export type BattleEncounterRef = {
  id: string
  source: {
    type: "map-npc-squad"
    squadId: string
    squadName: string
  }
  playerLabel: string
  startedAt: number
}
