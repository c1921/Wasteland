import type {
  BaseEditorState,
  BaseLayoutState,
  BasePointerTarget,
  BaseSelection,
  EdgeCoord,
  PlacementPreview,
  ResolvedBuildingFootprint,
  SubcellCoord,
} from "@/features/base/types"

function isEdgeCoordEqual(left: EdgeCoord, right: EdgeCoord) {
  return (
    left.col === right.col &&
    left.row === right.row &&
    left.axis === right.axis
  )
}

function isSubcellCoordEqual(left: SubcellCoord, right: SubcellCoord) {
  return left.subcol === right.subcol && left.subrow === right.subrow
}

function isPointerTargetEqual(
  left: BasePointerTarget | null,
  right: BasePointerTarget | null
) {
  if (left === right) {
    return true
  }

  if (!left || !right || left.type !== right.type) {
    return false
  }

  if (left.type === "terrain" && right.type === "terrain") {
    return (
      left.cell.col === right.cell.col &&
      left.cell.row === right.cell.row
    )
  }

  if (left.type === "building" && right.type === "building") {
    return left.buildingId === right.buildingId
  }

  if (left.type === "edge" && right.type === "edge") {
    return (
      left.buildingId === right.buildingId &&
      isEdgeCoordEqual(left.edge, right.edge)
    )
  }

  return false
}

function isFootprintEqual(
  left: ResolvedBuildingFootprint | null,
  right: ResolvedBuildingFootprint | null
) {
  if (left === right) {
    return true
  }

  if (!left || !right || left.kind !== right.kind) {
    return false
  }

  if (left.kind === "edge" && right.kind === "edge") {
    return isEdgeCoordEqual(left.edge, right.edge)
  }

  if (left.kind === "area" && right.kind === "area") {
    return (
      left.widthSubcells === right.widthSubcells &&
      left.heightSubcells === right.heightSubcells &&
      isSubcellCoordEqual(left.origin, right.origin)
    )
  }

  return false
}

function isBuildingEqual(
  left: BaseLayoutState["buildings"][number],
  right: BaseLayoutState["buildings"][number]
) {
  return (
    left.id === right.id &&
    left.definitionId === right.definitionId &&
    left.rotation === right.rotation &&
    isFootprintEqual(left.footprint, right.footprint)
  )
}

export function isBaseEditorStateEqual(
  left: BaseEditorState,
  right: BaseEditorState
) {
  return (
    left.tool === right.tool &&
    left.activeDefinitionId === right.activeDefinitionId &&
    left.rotation === right.rotation
  )
}

export function isBaseSelectionEqual(
  left: BaseSelection | null,
  right: BaseSelection | null
) {
  if (left === right) {
    return true
  }

  if (!left || !right || left.type !== right.type) {
    return false
  }

  if (left.type === "terrain" && right.type === "terrain") {
    return (
      left.cell.col === right.cell.col &&
      left.cell.row === right.cell.row
    )
  }

  if (left.type === "building" && right.type === "building") {
    return left.buildingId === right.buildingId
  }

  return false
}

export function isPlacementPreviewEqual(
  left: PlacementPreview,
  right: PlacementPreview
) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return left === right
  }

  return (
    left.tool === right.tool &&
    left.valid === right.valid &&
    left.action === right.action &&
    left.message === right.message &&
    isPointerTargetEqual(left.target, right.target) &&
    isFootprintEqual(left.footprint, right.footprint)
  )
}

export function isBaseLayoutStateEqual(
  left: BaseLayoutState,
  right: BaseLayoutState
) {
  if (left === right) {
    return true
  }

  if (left.buildings.length !== right.buildings.length) {
    return false
  }

  for (let index = 0; index < left.buildings.length; index += 1) {
    const leftBuilding = left.buildings[index]
    const rightBuilding = right.buildings[index]

    if (!rightBuilding || !isBuildingEqual(leftBuilding, rightBuilding)) {
      return false
    }
  }

  return true
}
