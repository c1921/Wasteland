import { useEffect, useMemo, useState } from "react"

import {
  BASE_BUILDING_DEFINITIONS,
  WASTELAND_BASE_TERRAIN,
  WASTELAND_BASE_WORLD_CONFIG,
} from "@/features/base/data/base-world"
import {
  getBaseLayoutState,
  resetBaseLayoutState,
  saveBaseLayoutState,
} from "@/features/base/data/session-layout"
import {
  BASE_TOOL_ORDER,
  BASE_TOOL_LABEL,
  DEFAULT_EQUIPMENT_DEFINITION_ID,
  DEFAULT_FURNITURE_DEFINITION_ID,
} from "@/features/base/constants"
import {
  getBuildingDefinitionById,
  getDefaultDefinitionIdForTool,
  getPlacedBuildingById,
  removeBuildingsByIds,
  resolveDefinitionForTool,
  resolveEditorPreviewSummary,
} from "@/features/base/lib/layout"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  PlacementPreview,
  PlacementTool,
  QuarterTurn,
} from "@/features/base/types"

const TERRAIN_LABEL: Record<string, string> = {
  grass: "草地",
  sand: "沙土",
  mountain: "山体",
  "deep-water": "深水",
}

function rotateQuarterTurn(current: QuarterTurn): QuarterTurn {
  switch (current) {
    case 0:
      return 90
    case 90:
      return 180
    case 180:
      return 270
    default:
      return 0
  }
}

export function useBasePanelModel() {
  const [layout, setLayout] = useState<BaseLayoutState>(() => getBaseLayoutState())
  const [tool, setTool] = useState<PlacementTool>("select")
  const [activeDefinitionId, setActiveDefinitionId] = useState<string | null>(
    DEFAULT_FURNITURE_DEFINITION_ID
  )
  const [rotation, setRotation] = useState<QuarterTurn>(0)
  const [selection, setSelection] = useState<BaseSelection | null>(null)
  const [preview, setPreview] = useState<PlacementPreview>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase() ?? ""

      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) {
        return
      }

      if (event.key === "Escape") {
        setTool("select")
        return
      }

      if (event.key.toLowerCase() === "r") {
        const definition = resolveDefinitionForTool(tool, activeDefinitionId)

        if (!definition?.rotationEnabled) {
          return
        }

        event.preventDefault()
        setRotation((current) => rotateQuarterTurn(current))
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [activeDefinitionId, tool])

  const editorState = useMemo<BaseEditorState>(
    () => ({
      tool,
      activeDefinitionId,
      rotation,
    }),
    [activeDefinitionId, rotation, tool]
  )

  const selectedBuilding = selection?.type === "building"
    ? getPlacedBuildingById(layout, selection.buildingId)
    : null
  const selectedBuildingDefinition = selectedBuilding
    ? getBuildingDefinitionById(selectedBuilding.definitionId)
    : null
  const selectedTerrain =
    selection?.type === "terrain"
      ? WASTELAND_BASE_TERRAIN[
        selection.cell.row * WASTELAND_BASE_WORLD_CONFIG.cols + selection.cell.col
      ] ?? null
      : null
  const selectedTerrainLabel = selectedTerrain ? TERRAIN_LABEL[selectedTerrain] : null
  const previewMessage = preview?.message ?? resolveEditorPreviewSummary(editorState)
  const canRotate = Boolean(resolveDefinitionForTool(tool, activeDefinitionId)?.rotationEnabled)
  const buildingCounts = layout.buildings.reduce(
    (result, building) => {
      const definition = getBuildingDefinitionById(building.definitionId)

      if (!definition) {
        return result
      }

      result.total += 1
      result[definition.category] += 1
      return result
    },
    {
      total: 0,
      structure: 0,
      furniture: 0,
      equipment: 0,
    } as Record<"total" | "structure" | "furniture" | "equipment", number>
  )

  const applyTool = (nextTool: PlacementTool) => {
    setTool(nextTool)

    if (nextTool === "select" || nextTool === "demolish") {
      return
    }

    const nextDefinitionId = getDefaultDefinitionIdForTool(nextTool)

    if (nextDefinitionId) {
      setActiveDefinitionId(nextDefinitionId)
      return
    }

    if (nextTool === "furniture" && !activeDefinitionId) {
      setActiveDefinitionId(DEFAULT_FURNITURE_DEFINITION_ID)
    }

    if (nextTool === "equipment" && !activeDefinitionId) {
      setActiveDefinitionId(DEFAULT_EQUIPMENT_DEFINITION_ID)
    }
  }

  const handleLayoutChange = (nextLayout: BaseLayoutState) => {
    setLayout(saveBaseLayoutState(nextLayout))
  }

  const handleRemoveSelected = () => {
    if (!selectedBuilding) {
      return
    }

    const result = removeBuildingsByIds(layout, [selectedBuilding.id])
    const persisted = saveBaseLayoutState(result.nextLayout)
    setLayout(persisted)
    setSelection(null)
  }

  const handleResetLayout = () => {
    setLayout(resetBaseLayoutState())
    setSelection(null)
  }

  return {
    world: WASTELAND_BASE_WORLD_CONFIG,
    terrain: WASTELAND_BASE_TERRAIN,
    layout,
    buildingDefinitions: BASE_BUILDING_DEFINITIONS,
    tool,
    toolOrder: BASE_TOOL_ORDER,
    toolLabelMap: BASE_TOOL_LABEL,
    editorState,
    selection,
    preview,
    previewMessage,
    selectedBuilding,
    selectedBuildingDefinition,
    selectedTerrain,
    selectedTerrainLabel,
    canRotate,
    buildingCounts,
    setSelection,
    setPreview,
    setRotation,
    setActiveDefinitionId,
    applyTool,
    handleLayoutChange,
    handleRemoveSelected,
    handleResetLayout,
  }
}
