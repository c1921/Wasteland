import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"

export function MapPanel() {
  return (
    <section className="h-full w-full">
      <PixiMapCanvas
        world={WASTELAND_WORLD_CONFIG}
        nodes={WASTELAND_MAP_NODES}
        obstacles={WASTELAND_MAP_OBSTACLES}
        className="h-full w-full rounded-none border-0"
      />
    </section>
  )
}
