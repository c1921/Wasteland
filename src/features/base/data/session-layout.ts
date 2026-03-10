import { getGameSessionStore } from "@/engine/session/game-session-store"
import {
  WASTELAND_BASE_INITIAL_LAYOUT,
} from "@/features/base/data/base-world"
import type {
  BaseLayoutState,
  PlacedBuilding,
  ResolvedBuildingFootprint,
} from "@/features/base/types"

const SESSION_BASE_LAYOUT_KEY = "base.layout"

function cloneFootprint(footprint: ResolvedBuildingFootprint): ResolvedBuildingFootprint {
  return {
    kind: "area",
    origin: { ...footprint.origin },
    widthSubcells: footprint.widthSubcells,
    heightSubcells: footprint.heightSubcells,
  }
}

function cloneBuilding(building: PlacedBuilding): PlacedBuilding {
  return {
    id: building.id,
    definitionId: building.definitionId,
    rotation: building.rotation,
    footprint: cloneFootprint(building.footprint),
  }
}

function cloneLayout(layout: BaseLayoutState): BaseLayoutState {
  return {
    buildings: layout.buildings.map(cloneBuilding),
  }
}

export function getBaseLayoutState() {
  const store = getGameSessionStore()
  const existing = store.get<BaseLayoutState | undefined>(SESSION_BASE_LAYOUT_KEY)

  if (existing) {
    return cloneLayout(existing)
  }

  const initial = cloneLayout(WASTELAND_BASE_INITIAL_LAYOUT)
  store.set(SESSION_BASE_LAYOUT_KEY, cloneLayout(initial))
  return initial
}

export function saveBaseLayoutState(nextLayout: BaseLayoutState) {
  const store = getGameSessionStore()
  const cloned = cloneLayout(nextLayout)
  store.set(SESSION_BASE_LAYOUT_KEY, cloneLayout(cloned))
  return cloned
}

export function resetBaseLayoutState() {
  return saveBaseLayoutState(WASTELAND_BASE_INITIAL_LAYOUT)
}
