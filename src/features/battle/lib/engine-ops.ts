import type {
  BattleSide,
  BattleState,
  CombatSquad,
  CombatUnit,
} from "@/features/battle/types"

const MAX_LOG_ENTRIES = 160

export type SquadSummary = {
  aliveCount: number
  totalCount: number
  averageHp: number
  averageMorale: number
  suppression: number
  cohesion: number
}

export type VolleyResult = {
  damage: number
  hits: number
  kills: number
}

export type SideModifiers = {
  hitModifier: number
  damageModifier: number
  allowRoutingFire: boolean
}

export type EngagementModifiers = {
  A: SideModifiers
  B: SideModifiers
  suppressionModifier: number
}

export type MutualFireExchange = {
  A: VolleyResult
  B: VolleyResult
}

let activeRandom: () => number = Math.random

export function withRandom<T>(random: () => number, execute: () => T) {
  const previous = activeRandom
  activeRandom = random

  try {
    return execute()
  } finally {
    activeRandom = previous
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, digits = 1) {
  const base = 10 ** digits
  return Math.round(value * base) / base
}

export function randomInRange(min: number, max: number) {
  return min + (max - min) * activeRandom()
}

function cloneUnit(unit: CombatUnit): CombatUnit {
  return {
    id: unit.id,
    name: unit.name,
    maxHp: unit.maxHp,
    hp: unit.hp,
    morale: unit.morale,
    alive: unit.alive,
    routing: unit.routing,
    stats: {
      firepower: unit.stats.firepower,
      accuracy: unit.stats.accuracy,
      defense: unit.stats.defense,
      maneuver: unit.stats.maneuver,
    },
  }
}

export function cloneSquad(squad: CombatSquad): CombatSquad {
  return {
    id: squad.id,
    name: squad.name,
    side: squad.side,
    units: squad.units.map(cloneUnit),
    cohesion: squad.cohesion,
    suppression: squad.suppression,
    fireAdvantage: squad.fireAdvantage,
    initialUnitCount: squad.initialUnitCount,
  }
}

export function cloneState(state: BattleState): BattleState {
  return {
    id: state.id,
    phase: state.phase,
    tickCount: state.tickCount,
    elapsedSec: state.elapsedSec,
    squads: [cloneSquad(state.squads[0]), cloneSquad(state.squads[1])],
    winnerSide: state.winnerSide,
    log: state.log.map((entry) => ({
      tick: entry.tick,
      phase: entry.phase,
      message: entry.message,
    })),
    phaseMeta: {
      sinceTick: state.phaseMeta.sinceTick,
      contactEstablished: state.phaseMeta.contactEstablished,
      contactScore: state.phaseMeta.contactScore,
      fireGap: state.phaseMeta.fireGap,
      maneuverPreparedBy: state.phaseMeta.maneuverPreparedBy,
      routingSide: state.phaseMeta.routingSide,
      pursuitTicks: state.phaseMeta.pursuitTicks,
      pursuitMaxTicks: state.phaseMeta.pursuitMaxTicks,
    },
  }
}

export function appendLog(state: BattleState, message: string) {
  state.log = [
    {
      tick: state.tickCount,
      phase: state.phase,
      message,
    },
    ...state.log,
  ].slice(0, MAX_LOG_ENTRIES)
}

export function getAliveUnits(squad: CombatSquad) {
  return squad.units.filter((unit) => unit.alive)
}

export function countAliveUnits(squad: CombatSquad) {
  return getAliveUnits(squad).length
}

function countRoutingAliveUnits(squad: CombatSquad) {
  return getAliveUnits(squad).filter((unit) => unit.routing).length
}

export function getAverageMorale(squad: CombatSquad) {
  const aliveUnits = getAliveUnits(squad)

  if (aliveUnits.length === 0) {
    return 0
  }

  const total = aliveUnits.reduce((sum, unit) => sum + unit.morale, 0)
  return total / aliveUnits.length
}

function getAverageHp(squad: CombatSquad) {
  const aliveUnits = getAliveUnits(squad)

  if (aliveUnits.length === 0) {
    return 0
  }

  const total = aliveUnits.reduce((sum, unit) => sum + unit.hp, 0)
  return total / aliveUnits.length
}

export function getAverageManeuver(squad: CombatSquad) {
  const aliveUnits = getAliveUnits(squad)

  if (aliveUnits.length === 0) {
    return 0
  }

  const total = aliveUnits.reduce((sum, unit) => sum + unit.stats.maneuver, 0)
  return total / aliveUnits.length
}

function getAliveRatio(squad: CombatSquad) {
  if (squad.initialUnitCount <= 0) {
    return 0
  }

  return countAliveUnits(squad) / squad.initialUnitCount
}

export function isSquadDefeated(squad: CombatSquad) {
  const aliveCount = countAliveUnits(squad)

  if (aliveCount === 0) {
    return true
  }

  const routingAliveCount = countRoutingAliveUnits(squad)
  return routingAliveCount === aliveCount
}

export function getSquadBySide(state: BattleState, side: BattleSide) {
  return state.squads.find((squad) => squad.side === side)
}

export function getEnemySquadBySide(state: BattleState, side: BattleSide) {
  return state.squads.find((squad) => squad.side !== side)
}

export function syncSquadDerivedStats(state: BattleState, routeMoraleThreshold: number) {
  for (const squad of state.squads) {
    for (const unit of squad.units) {
      if (!unit.alive) {
        unit.hp = 0
        unit.routing = true
        continue
      }

      unit.hp = clamp(unit.hp, 0, unit.maxHp)
      unit.morale = clamp(unit.morale, 0, 100)

      if (unit.morale <= routeMoraleThreshold) {
        unit.routing = true
      }
    }

    squad.suppression = clamp(squad.suppression, 0, 100)
    const averageMorale = getAverageMorale(squad)
    squad.cohesion = clamp(round(averageMorale - squad.suppression * 0.45, 1), 0, 100)
    squad.fireAdvantage = clamp(round(squad.fireAdvantage, 2), -200, 200)
  }

  state.phaseMeta.fireGap = round(state.squads[0].fireAdvantage - state.squads[1].fireAdvantage, 2)
}

function applyTeamMoralePenalty(
  squad: CombatSquad,
  amount: number,
  excludedUnitId: string | null = null
) {
  for (const unit of squad.units) {
    if (!unit.alive || unit.id === excludedUnitId) {
      continue
    }

    unit.morale = clamp(unit.morale - amount, 0, 100)
  }
}

function pickRandomAliveTarget(squad: CombatSquad) {
  const aliveUnits = getAliveUnits(squad)

  if (aliveUnits.length === 0) {
    return null
  }

  const index = Math.floor(activeRandom() * aliveUnits.length)
  return aliveUnits[index]
}

function resolveVolley({
  attacker,
  defender,
  modifiers,
  suppressionModifier,
}: {
  attacker: CombatSquad
  defender: CombatSquad
  modifiers: SideModifiers
  suppressionModifier: number
}): VolleyResult {
  const result: VolleyResult = {
    damage: 0,
    hits: 0,
    kills: 0,
  }

  const attackers = getAliveUnits(attacker)

  for (const unit of attackers) {
    const isRoutingShooter = unit.routing

    if (isRoutingShooter && !modifiers.allowRoutingFire) {
      continue
    }

    if (isRoutingShooter && activeRandom() < 0.55) {
      continue
    }

    const target = pickRandomAliveTarget(defender)

    if (!target) {
      break
    }

    const routingHitPenalty = isRoutingShooter ? -0.1 : 0
    const hitChance = clamp(
      0.05,
      0.95,
      0.35 +
        unit.stats.accuracy * 0.01 -
        target.stats.defense * 0.006 +
        modifiers.hitModifier +
        routingHitPenalty
    )

    if (activeRandom() > hitChance) {
      continue
    }

    const randomDamageFactor = randomInRange(0.8, 1.2)
    const rawDamage =
      unit.stats.firepower * modifiers.damageModifier * randomDamageFactor -
      target.stats.defense * 0.15
    const damage = Math.max(1, Math.round(rawDamage))

    target.hp = Math.max(0, target.hp - damage)
    target.morale = clamp(target.morale - randomInRange(8, 16), 0, 100)
    defender.suppression = clamp(
      defender.suppression + (4 + damage * 0.3) * suppressionModifier,
      0,
      100
    )

    result.damage += damage
    result.hits += 1

    if (target.hp <= 0) {
      target.alive = false
      target.routing = true
      result.kills += 1
      applyTeamMoralePenalty(defender, 4, target.id)
    }
  }

  return result
}

export function runMutualFire(
  state: BattleState,
  modifiers: EngagementModifiers,
  routeMoraleThreshold: number
): MutualFireExchange {
  const squadA = getSquadBySide(state, "A")
  const squadB = getSquadBySide(state, "B")

  if (!squadA || !squadB) {
    return {
      A: { damage: 0, hits: 0, kills: 0 },
      B: { damage: 0, hits: 0, kills: 0 },
    }
  }

  const volleyA = resolveVolley({
    attacker: squadA,
    defender: squadB,
    modifiers: modifiers.A,
    suppressionModifier: modifiers.suppressionModifier,
  })
  const volleyB = resolveVolley({
    attacker: squadB,
    defender: squadA,
    modifiers: modifiers.B,
    suppressionModifier: modifiers.suppressionModifier,
  })

  squadA.fireAdvantage += volleyA.damage + volleyA.hits * 2 + volleyA.kills * 8 - volleyB.damage * 0.35
  squadB.fireAdvantage += volleyB.damage + volleyB.hits * 2 + volleyB.kills * 8 - volleyA.damage * 0.35

  if (volleyB.hits === 0) {
    squadA.suppression = clamp(squadA.suppression - 2, 0, 100)
  }

  if (volleyA.hits === 0) {
    squadB.suppression = clamp(squadB.suppression - 2, 0, 100)
  }

  syncSquadDerivedStats(state, routeMoraleThreshold)

  return {
    A: volleyA,
    B: volleyB,
  }
}

export function resolveRoutingSide(state: BattleState): BattleSide {
  const squadA = getSquadBySide(state, "A")
  const squadB = getSquadBySide(state, "B")

  if (!squadA || !squadB) {
    return "A"
  }

  const moraleA = getAverageMorale(squadA)
  const moraleB = getAverageMorale(squadB)
  const ratioA = getAliveRatio(squadA)
  const ratioB = getAliveRatio(squadB)

  if (moraleA === moraleB) {
    return ratioA <= ratioB ? "A" : "B"
  }

  return moraleA < moraleB ? "A" : "B"
}

export function resolveRoutTrigger(
  state: BattleState,
  routeMoraleThreshold: number,
  surviveThreshold: number
): BattleSide | null {
  const squadA = getSquadBySide(state, "A")
  const squadB = getSquadBySide(state, "B")

  if (!squadA || !squadB) {
    return null
  }

  const moraleA = getAverageMorale(squadA)
  const moraleB = getAverageMorale(squadB)
  const ratioA = getAliveRatio(squadA)
  const ratioB = getAliveRatio(squadB)
  const aBroken = moraleA < routeMoraleThreshold || ratioA < surviveThreshold
  const bBroken = moraleB < routeMoraleThreshold || ratioB < surviveThreshold

  if (!aBroken && !bBroken) {
    return null
  }

  if (aBroken && bBroken) {
    return resolveRoutingSide(state)
  }

  return aBroken ? "A" : "B"
}

export function resolveWinnerSide(state: BattleState): BattleSide | null {
  const squadA = getSquadBySide(state, "A")
  const squadB = getSquadBySide(state, "B")

  if (!squadA || !squadB) {
    return null
  }

  const aDefeated = isSquadDefeated(squadA)
  const bDefeated = isSquadDefeated(squadB)

  if (aDefeated && bDefeated) {
    return null
  }

  if (aDefeated) {
    return "B"
  }

  if (bDefeated) {
    return "A"
  }

  const aliveA = countAliveUnits(squadA)
  const aliveB = countAliveUnits(squadB)

  if (aliveA !== aliveB) {
    return aliveA > aliveB ? "A" : "B"
  }

  const hpA = getAliveUnits(squadA).reduce((sum, unit) => sum + unit.hp, 0)
  const hpB = getAliveUnits(squadB).reduce((sum, unit) => sum + unit.hp, 0)

  if (hpA === hpB) {
    return null
  }

  return hpA > hpB ? "A" : "B"
}

export function describeExchange(state: BattleState, prefix: string, exchange: MutualFireExchange) {
  appendLog(
    state,
    `${prefix} A造成${exchange.A.damage}伤害/${exchange.A.kills}击杀，B造成${exchange.B.damage}伤害/${exchange.B.kills}击杀，火力差${round(
      state.phaseMeta.fireGap,
      1
    )}`
  )
}

export function summarizeSquad(squad: CombatSquad): SquadSummary {
  return {
    aliveCount: countAliveUnits(squad),
    totalCount: squad.initialUnitCount,
    averageHp: round(getAverageHp(squad), 1),
    averageMorale: round(getAverageMorale(squad), 1),
    suppression: round(squad.suppression, 1),
    cohesion: round(squad.cohesion, 1),
  }
}
