import {
  createSampleBattleSquads,
  createSampleBattleStateId,
} from "@/features/battle/data/sample-data"
import type {
  BattlePhase,
  BattleSide,
  BattleState,
  CombatSquad,
  CombatUnit,
  PhaseHandler,
} from "@/features/battle/types"

export const BATTLE_TICK_MS = 1000
export const MAX_TICKS_PER_FRAME = 10
export const ROUT_MORALE_THRESHOLD = 28
export const SURVIVE_THRESHOLD = 0.35
export const FIRE_GAP_TO_MANEUVER = 30
const FIRE_GAP_BACK_TO_FIRE = 15
const CONTACT_SCORE_THRESHOLD = 50
const MAX_LOG_ENTRIES = 160

export const BATTLE_PHASE_LABELS: Record<BattlePhase, string> = {
  contact: "接触",
  "fire-advantage": "火力优势争夺",
  maneuver: "机动突击",
  rout: "崩溃/撤离",
  pursuit: "追击/脱离",
  ended: "结束",
}

export type SquadSummary = {
  aliveCount: number
  totalCount: number
  averageHp: number
  averageMorale: number
  suppression: number
  cohesion: number
}

export type EngineTickOptions = {
  random?: () => number
}

type VolleyResult = {
  damage: number
  hits: number
  kills: number
}

type SideModifiers = {
  hitModifier: number
  damageModifier: number
  allowRoutingFire: boolean
}

type EngagementModifiers = {
  A: SideModifiers
  B: SideModifiers
  suppressionModifier: number
}

let activeRandom: () => number = Math.random

function withRandom<T>(random: () => number, execute: () => T) {
  const previous = activeRandom
  activeRandom = random

  try {
    return execute()
  } finally {
    activeRandom = previous
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 1) {
  const base = 10 ** digits
  return Math.round(value * base) / base
}

function randomInRange(min: number, max: number) {
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

function cloneSquad(squad: CombatSquad): CombatSquad {
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

function cloneState(state: BattleState): BattleState {
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

function appendLog(state: BattleState, message: string) {
  state.log = [
    {
      tick: state.tickCount,
      phase: state.phase,
      message,
    },
    ...state.log,
  ].slice(0, MAX_LOG_ENTRIES)
}

function getAliveUnits(squad: CombatSquad) {
  return squad.units.filter((unit) => unit.alive)
}

function countAliveUnits(squad: CombatSquad) {
  return getAliveUnits(squad).length
}

function countRoutingAliveUnits(squad: CombatSquad) {
  return getAliveUnits(squad).filter((unit) => unit.routing).length
}

function getAverageMorale(squad: CombatSquad) {
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

function getAverageManeuver(squad: CombatSquad) {
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

function getSquadBySide(state: BattleState, side: BattleSide) {
  return state.squads.find((squad) => squad.side === side)
}

function getEnemySquadBySide(state: BattleState, side: BattleSide) {
  return state.squads.find((squad) => squad.side !== side)
}

function syncSquadDerivedStats(state: BattleState) {
  for (const squad of state.squads) {
    for (const unit of squad.units) {
      if (!unit.alive) {
        unit.hp = 0
        unit.routing = true
        continue
      }

      unit.hp = clamp(unit.hp, 0, unit.maxHp)
      unit.morale = clamp(unit.morale, 0, 100)

      if (unit.morale <= ROUT_MORALE_THRESHOLD) {
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

function runMutualFire(state: BattleState, modifiers: EngagementModifiers) {
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

  syncSquadDerivedStats(state)

  return {
    A: volleyA,
    B: volleyB,
  }
}

function resolveRoutingSide(state: BattleState): BattleSide {
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

function resolveRoutTrigger(state: BattleState): BattleSide | null {
  const squadA = getSquadBySide(state, "A")
  const squadB = getSquadBySide(state, "B")

  if (!squadA || !squadB) {
    return null
  }

  const moraleA = getAverageMorale(squadA)
  const moraleB = getAverageMorale(squadB)
  const ratioA = getAliveRatio(squadA)
  const ratioB = getAliveRatio(squadB)
  const aBroken = moraleA < ROUT_MORALE_THRESHOLD || ratioA < SURVIVE_THRESHOLD
  const bBroken = moraleB < ROUT_MORALE_THRESHOLD || ratioB < SURVIVE_THRESHOLD

  if (!aBroken && !bBroken) {
    return null
  }

  if (aBroken && bBroken) {
    return resolveRoutingSide(state)
  }

  return aBroken ? "A" : "B"
}

function resolveWinnerSide(state: BattleState): BattleSide | null {
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

function describeExchange(
  state: BattleState,
  prefix: string,
  exchange: {
    A: VolleyResult
    B: VolleyResult
  }
) {
  appendLog(
    state,
    `${prefix} A造成${exchange.A.damage}伤害/${exchange.A.kills}击杀，B造成${exchange.B.damage}伤害/${exchange.B.kills}击杀，火力差${round(
      state.phaseMeta.fireGap,
      1
    )}`
  )
}

const phaseHandlers: Record<BattlePhase, PhaseHandler> = {
  contact: {
    enter: (state) => {
      state.phaseMeta.contactEstablished = false
      state.phaseMeta.contactScore = 0
      appendLog(state, "双方进入接触阶段，开始侦察与试探射击。")
      return state
    },
    tick: (state) => {
      const exchange = runMutualFire(state, {
        A: { hitModifier: -0.08, damageModifier: 0.75, allowRoutingFire: false },
        B: { hitModifier: -0.08, damageModifier: 0.75, allowRoutingFire: false },
        suppressionModifier: 0.9,
      })
      const contactGain =
        (countAliveUnits(state.squads[0]) + countAliveUnits(state.squads[1])) * 0.6 +
        (getAverageManeuver(state.squads[0]) + getAverageManeuver(state.squads[1])) * 0.05 +
        randomInRange(2, 8)

      state.phaseMeta.contactScore = clamp(state.phaseMeta.contactScore + contactGain, 0, 100)
      state.phaseMeta.contactEstablished = state.phaseMeta.contactScore >= CONTACT_SCORE_THRESHOLD

      describeExchange(
        state,
        `接触推进(${round(state.phaseMeta.contactScore, 1)}%)`,
        exchange
      )

      return state
    },
    exit: (state) => {
      appendLog(state, "接触完成，转入火力优势争夺。")
      return state
    },
  },
  "fire-advantage": {
    enter: (state) => {
      appendLog(state, "双方展开压制与反压制，争夺火力优势。")
      return state
    },
    tick: (state) => {
      const exchange = runMutualFire(state, {
        A: { hitModifier: 0, damageModifier: 1, allowRoutingFire: true },
        B: { hitModifier: 0, damageModifier: 1, allowRoutingFire: true },
        suppressionModifier: 1.1,
      })

      describeExchange(state, "火力交锋", exchange)
      return state
    },
    exit: (state) => {
      appendLog(state, "火力差达到阈值，机动窗口出现。")
      return state
    },
  },
  maneuver: {
    enter: (state) => {
      if (!state.phaseMeta.maneuverPreparedBy) {
        state.phaseMeta.maneuverPreparedBy = state.phaseMeta.fireGap >= 0 ? "A" : "B"
      }

      const attacker = state.phaseMeta.maneuverPreparedBy
      appendLog(state, `${attacker}方发起机动突击，试图打穿战线。`)
      return state
    },
    tick: (state) => {
      const attacker = state.phaseMeta.maneuverPreparedBy ?? "A"
      const modifiers: EngagementModifiers =
        attacker === "A"
          ? {
              A: { hitModifier: 0.12, damageModifier: 1.25, allowRoutingFire: true },
              B: { hitModifier: -0.08, damageModifier: 0.85, allowRoutingFire: true },
              suppressionModifier: 1.15,
            }
          : {
              A: { hitModifier: -0.08, damageModifier: 0.85, allowRoutingFire: true },
              B: { hitModifier: 0.12, damageModifier: 1.25, allowRoutingFire: true },
              suppressionModifier: 1.15,
            }

      const exchange = runMutualFire(state, modifiers)
      describeExchange(state, "机动突击", exchange)
      return state
    },
    exit: (state) => {
      appendLog(state, "机动突击阶段结束。")
      return state
    },
  },
  rout: {
    enter: (state) => {
      const routingSide = state.phaseMeta.routingSide ?? resolveRoutingSide(state)
      const routingSquad = getSquadBySide(state, routingSide)
      const enemySquad = getEnemySquadBySide(state, routingSide)

      state.phaseMeta.routingSide = routingSide

      if (routingSquad) {
        for (const unit of routingSquad.units) {
          if (!unit.alive) {
            continue
          }

          unit.routing = true
          unit.morale = Math.min(unit.morale, ROUT_MORALE_THRESHOLD - 2)
        }
      }

      if (enemySquad) {
        for (const unit of enemySquad.units) {
          if (!unit.alive || unit.morale <= ROUT_MORALE_THRESHOLD) {
            continue
          }

          unit.routing = false
        }
      }

      syncSquadDerivedStats(state)
      appendLog(state, `${routingSide}方战线崩溃，开始组织撤离。`)
      return state
    },
    tick: (state) => {
      const routingSide = state.phaseMeta.routingSide ?? resolveRoutingSide(state)
      const pursuerSide: BattleSide = routingSide === "A" ? "B" : "A"
      const modifiers: EngagementModifiers =
        pursuerSide === "A"
          ? {
              A: { hitModifier: 0.14, damageModifier: 1.2, allowRoutingFire: true },
              B: { hitModifier: -0.2, damageModifier: 0.6, allowRoutingFire: true },
              suppressionModifier: 1.2,
            }
          : {
              A: { hitModifier: -0.2, damageModifier: 0.6, allowRoutingFire: true },
              B: { hitModifier: 0.14, damageModifier: 1.2, allowRoutingFire: true },
              suppressionModifier: 1.2,
            }

      const exchange = runMutualFire(state, modifiers)
      const routingSquad = getSquadBySide(state, routingSide)
      let dropouts = 0

      if (routingSquad) {
        for (const unit of routingSquad.units) {
          if (!unit.alive || !unit.routing) {
            continue
          }

          if (activeRandom() > 0.18) {
            continue
          }

          const attritionDamage = Math.max(1, Math.round(randomInRange(2, 6)))
          unit.hp = Math.max(0, unit.hp - attritionDamage)
          unit.morale = clamp(unit.morale - randomInRange(4, 9), 0, 100)

          if (unit.hp <= 0) {
            unit.alive = false
            dropouts += 1
          }
        }
      }

      syncSquadDerivedStats(state)
      describeExchange(state, `撤离混乱(掉队${dropouts})`, exchange)
      return state
    },
    exit: (state) => {
      appendLog(state, "撤离队形失控，战斗转入追击/脱离。")
      return state
    },
  },
  pursuit: {
    enter: (state) => {
      state.phaseMeta.pursuitTicks = 0
      state.phaseMeta.pursuitMaxTicks = Math.max(1, Math.round(randomInRange(1, 3)))
      appendLog(state, "胜方开始追击，败方尝试脱离战场。")
      return state
    },
    tick: (state) => {
      const routingSide = state.phaseMeta.routingSide ?? resolveRoutingSide(state)
      const pursuerSide: BattleSide = routingSide === "A" ? "B" : "A"
      const modifiers: EngagementModifiers =
        pursuerSide === "A"
          ? {
              A: { hitModifier: 0.1, damageModifier: 1.05, allowRoutingFire: true },
              B: { hitModifier: -0.25, damageModifier: 0.55, allowRoutingFire: true },
              suppressionModifier: 0.95,
            }
          : {
              A: { hitModifier: -0.25, damageModifier: 0.55, allowRoutingFire: true },
              B: { hitModifier: 0.1, damageModifier: 1.05, allowRoutingFire: true },
              suppressionModifier: 0.95,
            }

      const exchange = runMutualFire(state, modifiers)
      state.phaseMeta.pursuitTicks += 1
      describeExchange(
        state,
        `追击进度(${state.phaseMeta.pursuitTicks}/${state.phaseMeta.pursuitMaxTicks})`,
        exchange
      )
      return state
    },
    exit: (state) => {
      appendLog(state, "追击结束，双方脱离接触。")
      return state
    },
  },
  ended: {
    enter: (state) => {
      const winner = state.winnerSide
      const winnerText = winner ? `${winner}方` : "双方"
      appendLog(state, `战斗结束：${winnerText}达成战场目标。`)
      return state
    },
    tick: (state) => state,
    exit: (state) => state,
  },
}

function resolveNextPhase(state: BattleState): BattlePhase | null {
  switch (state.phase) {
    case "contact": {
      const routSide = resolveRoutTrigger(state)

      if (routSide) {
        state.phaseMeta.routingSide = routSide
        return "rout"
      }

      if (state.phaseMeta.contactEstablished) {
        return "fire-advantage"
      }

      return null
    }
    case "fire-advantage": {
      const routSide = resolveRoutTrigger(state)

      if (routSide) {
        state.phaseMeta.routingSide = routSide
        return "rout"
      }

      if (Math.abs(state.phaseMeta.fireGap) >= FIRE_GAP_TO_MANEUVER) {
        state.phaseMeta.maneuverPreparedBy = state.phaseMeta.fireGap >= 0 ? "A" : "B"
        return "maneuver"
      }

      return null
    }
    case "maneuver": {
      const routSide = resolveRoutTrigger(state)

      if (routSide) {
        state.phaseMeta.routingSide = routSide
        return "rout"
      }

      if (Math.abs(state.phaseMeta.fireGap) < FIRE_GAP_BACK_TO_FIRE) {
        return "fire-advantage"
      }

      return null
    }
    case "rout": {
      const routingSide = state.phaseMeta.routingSide ?? resolveRoutingSide(state)
      const routingSquad = getSquadBySide(state, routingSide)

      if (routingSquad && isSquadDefeated(routingSquad)) {
        return "pursuit"
      }

      return null
    }
    case "pursuit": {
      const routingSide = state.phaseMeta.routingSide ?? resolveRoutingSide(state)
      const routingSquad = getSquadBySide(state, routingSide)

      if (routingSquad && isSquadDefeated(routingSquad)) {
        return "ended"
      }

      if (state.phaseMeta.pursuitTicks >= state.phaseMeta.pursuitMaxTicks) {
        return "ended"
      }

      return null
    }
    case "ended":
      return null
  }
}

function transitionPhase(state: BattleState, nextPhase: BattlePhase) {
  if (state.phase === nextPhase) {
    return state
  }

  let nextState = phaseHandlers[state.phase].exit(state)
  nextState.phase = nextPhase
  nextState.phaseMeta.sinceTick = nextState.tickCount

  if (nextPhase === "ended") {
    nextState.winnerSide = resolveWinnerSide(nextState)
  }

  nextState = phaseHandlers[nextPhase].enter(nextState)
  syncSquadDerivedStats(nextState)
  return nextState
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

export function createBattleState(params?: {
  id?: string
  squads?: [CombatSquad, CombatSquad]
}) {
  const squads = params?.squads ?? createSampleBattleSquads()
  const state: BattleState = {
    id: params?.id ?? createSampleBattleStateId(),
    phase: "contact",
    tickCount: 0,
    elapsedSec: 0,
    squads: [cloneSquad(squads[0]), cloneSquad(squads[1])],
    winnerSide: null,
    log: [],
    phaseMeta: {
      sinceTick: 0,
      contactEstablished: false,
      contactScore: 0,
      fireGap: 0,
      maneuverPreparedBy: null,
      routingSide: null,
      pursuitTicks: 0,
      pursuitMaxTicks: 1,
    },
  }

  syncSquadDerivedStats(state)
  return phaseHandlers.contact.enter(state)
}

export function createSampleBattleState() {
  return createBattleState()
}

export function engineTick(state: BattleState, options: EngineTickOptions = {}) {
  if (state.phase === "ended") {
    return state
  }

  const random = options.random ?? Math.random

  return withRandom(random, () => {
    let nextState = cloneState(state)
    nextState.tickCount += 1
    nextState.elapsedSec += 1
    nextState = phaseHandlers[nextState.phase].tick(nextState)

    const nextPhase = resolveNextPhase(nextState)

    if (nextPhase) {
      nextState = transitionPhase(nextState, nextPhase)
    }

    return nextState
  })
}
