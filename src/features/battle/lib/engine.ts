import {
  createSampleBattleSquads,
  createSampleBattleStateId,
} from "@/features/battle/data/sample-data"
import {
  appendLog,
  clamp,
  cloneSquad,
  cloneState,
  countAliveUnits,
  describeExchange,
  getAverageManeuver,
  getEnemySquadBySide,
  getSquadBySide,
  isSquadDefeated,
  resolveRoutTrigger,
  resolveRoutingSide,
  resolveWinnerSide,
  randomInRange,
  round,
  runMutualFire,
  summarizeSquad,
  syncSquadDerivedStats,
  withRandom,
  type EngagementModifiers,
  type SquadSummary,
} from "@/features/battle/lib/engine-ops"
import type {
  BattlePhase,
  BattleSide,
  BattleState,
  CombatSquad,
  PhaseHandler,
} from "@/features/battle/types"

export const BATTLE_TICK_MS = 1000
export const MAX_TICKS_PER_FRAME = 10
export const ROUT_MORALE_THRESHOLD = 28
export const SURVIVE_THRESHOLD = 0.35
export const FIRE_GAP_TO_MANEUVER = 30
const FIRE_GAP_BACK_TO_FIRE = 15
const CONTACT_SCORE_THRESHOLD = 50

export const BATTLE_PHASE_LABELS: Record<BattlePhase, string> = {
  contact: "接触",
  "fire-advantage": "火力优势争夺",
  maneuver: "机动突击",
  rout: "崩溃/撤离",
  pursuit: "追击/脱离",
  ended: "结束",
}

export type { SquadSummary }

export type EngineTickOptions = {
  random?: () => number
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
      const exchange = runMutualFire(
        state,
        {
          A: { hitModifier: -0.08, damageModifier: 0.75, allowRoutingFire: false },
          B: { hitModifier: -0.08, damageModifier: 0.75, allowRoutingFire: false },
          suppressionModifier: 0.9,
        },
        ROUT_MORALE_THRESHOLD
      )
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
      const exchange = runMutualFire(
        state,
        {
          A: { hitModifier: 0, damageModifier: 1, allowRoutingFire: true },
          B: { hitModifier: 0, damageModifier: 1, allowRoutingFire: true },
          suppressionModifier: 1.1,
        },
        ROUT_MORALE_THRESHOLD
      )

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

      const exchange = runMutualFire(state, modifiers, ROUT_MORALE_THRESHOLD)
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

      syncSquadDerivedStats(state, ROUT_MORALE_THRESHOLD)
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

      const exchange = runMutualFire(state, modifiers, ROUT_MORALE_THRESHOLD)
      const routingSquad = getSquadBySide(state, routingSide)
      let dropouts = 0

      if (routingSquad) {
        for (const unit of routingSquad.units) {
          if (!unit.alive || !unit.routing) {
            continue
          }

          if (randomInRange(0, 1) > 0.18) {
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

      syncSquadDerivedStats(state, ROUT_MORALE_THRESHOLD)
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

      const exchange = runMutualFire(state, modifiers, ROUT_MORALE_THRESHOLD)
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
      const routSide = resolveRoutTrigger(state, ROUT_MORALE_THRESHOLD, SURVIVE_THRESHOLD)

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
      const routSide = resolveRoutTrigger(state, ROUT_MORALE_THRESHOLD, SURVIVE_THRESHOLD)

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
      const routSide = resolveRoutTrigger(state, ROUT_MORALE_THRESHOLD, SURVIVE_THRESHOLD)

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
  syncSquadDerivedStats(nextState, ROUT_MORALE_THRESHOLD)
  return nextState
}

export { isSquadDefeated, summarizeSquad }

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

  syncSquadDerivedStats(state, ROUT_MORALE_THRESHOLD)
  return phaseHandlers.contact.enter(state)
}

export function createSampleBattleState() {
  return createBattleState()
}

export function engineTick(state: BattleState, options: EngineTickOptions = {}) {
  if (state.phase === "ended") {
    return state
  }

  const randomFn = options.random ?? Math.random

  return withRandom(randomFn, () => {
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
