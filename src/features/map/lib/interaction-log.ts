import type {
  MapInteractionLogEntry,
  MapInteractionTarget,
} from "@/features/map/types"

export const MAP_INTERACTION_LOG_LIMIT = 50

function isSameTarget(a: MapInteractionTarget, b: MapInteractionTarget) {
  if (a.type === "node" && b.type === "node") {
    return a.nodeId === b.nodeId
  }

  if (a.type === "squad" && b.type === "squad") {
    return a.squadId === b.squadId
  }

  return false
}

export function appendInteractionLog(
  logs: MapInteractionLogEntry[],
  next: MapInteractionLogEntry,
  limit = MAP_INTERACTION_LOG_LIMIT
) {
  const safeLimit = Math.max(1, Math.floor(limit))
  const merged = [...logs, next]

  if (merged.length <= safeLimit) {
    return merged
  }

  return merged.slice(merged.length - safeLimit)
}

export function filterInteractionLogsByTarget(
  logs: MapInteractionLogEntry[],
  target: MapInteractionTarget | null
) {
  if (!target) {
    return []
  }

  return logs.filter((entry) => isSameTarget(entry.target, target))
}
