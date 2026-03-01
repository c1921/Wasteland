import { useCallback, useEffect, useRef, useState } from "react"

import {
  BATTLE_TICK_MS,
  MAX_TICKS_PER_FRAME,
  createBattleState,
  engineTick,
} from "@/features/battle/lib/engine"
import { applyBattleOutcome, type BattleOutcomeSummary } from "@/features/battle/data/session-battle-outcome"
import {
  buildEnemyCombatSquadFromNpcTemplate,
  buildPlayerCombatSquadFromCharacters,
} from "@/features/battle/lib/adapters"
import type { BattleEncounterRef, BattleState } from "@/features/battle/types"
import { getCharacters } from "@/features/character/data/characters"
import { getPersistedCombatStatesByCharacterIds } from "@/features/character/data/session-combat-state"
import { getNpcSquadById } from "@/features/map/data/npc-squads"
import { useGameClock } from "@/features/time/game-clock-store"

function resolveEncounterBattleState(encounter: BattleEncounterRef | null) {
  if (!encounter) {
    return {
      state: null as BattleState | null,
      unavailableReason: "请先在地图中选择NPC队伍并发起战斗。",
    }
  }

  const playerCharacters = getCharacters()

  if (playerCharacters.length === 0) {
    return {
      state: null as BattleState | null,
      unavailableReason: "我方队伍暂无可参战成员。",
    }
  }

  const enemyTemplate = getNpcSquadById(encounter.source.squadId)

  if (!enemyTemplate || enemyTemplate.members.length === 0) {
    return {
      state: null as BattleState | null,
      unavailableReason: "目标队伍不存在或已无可参战成员。",
    }
  }

  const playerStates = getPersistedCombatStatesByCharacterIds(
    playerCharacters.map((character) => character.id)
  )

  const playerSquad = buildPlayerCombatSquadFromCharacters(
    playerCharacters,
    playerStates,
    encounter.playerLabel
  )
  const enemySquad = buildEnemyCombatSquadFromNpcTemplate(enemyTemplate)

  return {
    state: createBattleState({
      id: encounter.id,
      squads: [playerSquad, enemySquad],
    }),
    unavailableReason: null as string | null,
  }
}

export function useAutoBattle(encounter: BattleEncounterRef | null) {
  const { speed, isPaused = false } = useGameClock()
  const [state, setState] = useState<BattleState | null>(() => {
    return resolveEncounterBattleState(encounter).state
  })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(() => {
    return resolveEncounterBattleState(encounter).unavailableReason
  })
  const [outcomeSummary, setOutcomeSummary] = useState<BattleOutcomeSummary | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const rafIdRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const stateRef = useRef(state)
  const encounterRef = useRef(encounter)
  const outcomeAppliedRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    encounterRef.current = encounter
    const resolved = resolveEncounterBattleState(encounter)
    stateRef.current = resolved.state
    setState(resolved.state)
    setUnavailableReason(resolved.unavailableReason)
    setOutcomeSummary(null)
    outcomeAppliedRef.current = false
    setIsRunning(false)
    accumulatorRef.current = 0
    lastTimestampRef.current = null
  }, [encounter])

  const stopBattle = useCallback(() => {
    setIsRunning(false)
  }, [])

  const startBattle = useCallback(() => {
    if (!stateRef.current || stateRef.current.phase === "ended") {
      return
    }

    setIsRunning(true)
  }, [])

  const resetBattle = useCallback(() => {
    const resolved = resolveEncounterBattleState(encounterRef.current)

    setIsRunning(false)
    accumulatorRef.current = 0
    lastTimestampRef.current = null
    outcomeAppliedRef.current = false
    setOutcomeSummary(null)
    stateRef.current = resolved.state
    setState(resolved.state)
    setUnavailableReason(resolved.unavailableReason)
  }, [])

  useEffect(() => {
    if (!isRunning || !stateRef.current) {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      lastTimestampRef.current = null
      return
    }

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
        rafIdRef.current = window.requestAnimationFrame(step)
        return
      }

      const deltaRealMs = Math.max(0, timestamp - lastTimestampRef.current)
      lastTimestampRef.current = timestamp

      if (!isPaused && speed > 0) {
        accumulatorRef.current += deltaRealMs * speed
        const ticksToProcess = Math.min(
          MAX_TICKS_PER_FRAME,
          Math.floor(accumulatorRef.current / BATTLE_TICK_MS)
        )

        if (ticksToProcess > 0) {
          accumulatorRef.current -= ticksToProcess * BATTLE_TICK_MS
          let nextState = stateRef.current

          if (!nextState) {
            setIsRunning(false)
            return
          }

          for (let i = 0; i < ticksToProcess; i += 1) {
            if (nextState.phase === "ended") {
              break
            }

            nextState = engineTick(nextState)
          }

          if (nextState !== stateRef.current) {
            stateRef.current = nextState
            setState(nextState)
          }

          if (nextState.phase === "ended") {
            setIsRunning(false)
            accumulatorRef.current = 0

            if (!outcomeAppliedRef.current && encounterRef.current) {
              const summary = applyBattleOutcome({
                state: nextState,
                encounter: encounterRef.current,
              })
              setOutcomeSummary(summary)
              outcomeAppliedRef.current = true
            }

            return
          }
        }
      }

      rafIdRef.current = window.requestAnimationFrame(step)
    }

    rafIdRef.current = window.requestAnimationFrame(step)

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isPaused, isRunning, speed])

  return {
    state,
    unavailableReason,
    outcomeSummary,
    isRunning,
    startBattle,
    stopBattle,
    resetBattle,
  }
}
