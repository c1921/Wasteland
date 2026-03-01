import { describe, expect, it } from "vitest"

import { createBattleState, engineTick } from "@/features/battle/lib/engine"
import type { CombatSquad, CombatUnit } from "@/features/battle/types"

function buildUnit(id: string, morale = 75): CombatUnit {
  return {
    id,
    name: id,
    maxHp: 100,
    hp: 100,
    morale,
    alive: true,
    routing: false,
    stats: {
      firepower: 14,
      accuracy: 62,
      defense: 12,
      maneuver: 55,
    },
  }
}

function buildSquad(side: "A" | "B", size = 4): CombatSquad {
  const units = Array.from({ length: size }, (_, index) => buildUnit(`${side}-${index + 1}`))

  return {
    id: `squad-${side}`,
    name: `队伍-${side}`,
    side,
    units,
    cohesion: 100,
    suppression: 0,
    fireAdvantage: 0,
    initialUnitCount: units.length,
  }
}

function buildState() {
  return createBattleState({
    id: "test-battle",
    squads: [buildSquad("A"), buildSquad("B")],
  })
}

describe("battle engine", () => {
  it("creates battle state in contact phase with enter log", () => {
    const state = buildState()

    expect(state.phase).toBe("contact")
    expect(state.log.length).toBeGreaterThan(0)
    expect(state.log[0].message).toContain("接触阶段")
  })

  it("transitions from contact to fire-advantage", () => {
    const state = buildState()
    state.phaseMeta.contactScore = 49

    const next = engineTick(state, { random: () => 0.5 })

    expect(next.phase).toBe("fire-advantage")
  })

  it("transitions from fire-advantage to maneuver when fire gap is high", () => {
    const state = buildState()
    state.phase = "fire-advantage"
    state.squads[0].fireAdvantage = 80
    state.squads[1].fireAdvantage = 0
    state.phaseMeta.fireGap = 80

    const next = engineTick(state, { random: () => 0.5 })

    expect(next.phase).toBe("maneuver")
    expect(next.phaseMeta.maneuverPreparedBy).toBe("A")
  })

  it("transitions from maneuver to rout on low morale", () => {
    const state = buildState()
    state.phase = "maneuver"
    state.phaseMeta.maneuverPreparedBy = "A"

    for (const unit of state.squads[1].units) {
      unit.morale = 10
    }

    const next = engineTick(state, { random: () => 0.5 })

    expect(next.phase).toBe("rout")
    expect(next.phaseMeta.routingSide).toBe("B")
  })

  it("progresses rout to pursuit and then to ended", () => {
    const state = buildState()
    state.phase = "rout"
    state.phaseMeta.routingSide = "B"

    for (const unit of state.squads[1].units) {
      unit.routing = true
      unit.morale = 5
    }

    const pursuitState = engineTick(state, { random: () => 0.5 })
    const endedState = engineTick(pursuitState, { random: () => 0.5 })

    expect(pursuitState.phase).toBe("pursuit")
    expect(endedState.phase).toBe("ended")
    expect(endedState.winnerSide).toBe("A")
  })

  it("keeps ended state unchanged on tick", () => {
    const state = buildState()
    state.phase = "ended"
    state.winnerSide = "A"

    const next = engineTick(state, { random: () => 0.5 })

    expect(next).toBe(state)
  })
})
