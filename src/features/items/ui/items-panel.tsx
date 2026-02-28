import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getNpcSquadTemplates } from "@/features/map/data/npc-squads"
import { WASTELAND_MAP_NODES } from "@/features/map/data/wasteland-map"
import {
  getLocationInventoryMap,
  getNpcSquadInventoryMap,
  getPlayerTeamInventory,
} from "@/features/items/data/session-inventories"
import { ITEM_CATEGORY_LABEL, type Item } from "@/features/items/types"
import { PanelShell } from "@/shared/ui/panel-shell"

function InventoryList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无物品。</p>
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border px-2 py-1.5">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground text-xs">
            类别: {ITEM_CATEGORY_LABEL[item.category]} · 重量: {item.weight.toFixed(1)} · 价值:{" "}
            {item.value} · 数量: {item.quantity}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function ItemsPanel() {
  const playerTeamInventory = useMemo(() => getPlayerTeamInventory(), [])

  const locationInventories = useMemo(() => {
    const nodeIds = WASTELAND_MAP_NODES.map((node) => node.id)
    const inventoryMap = getLocationInventoryMap(nodeIds)

    return WASTELAND_MAP_NODES.map((node) => ({
      id: node.id,
      name: node.name,
      items: inventoryMap[node.id] ?? [],
    }))
  }, [])

  const npcSquadInventories = useMemo(() => {
    const squads = getNpcSquadTemplates()
    const inventoryMap = getNpcSquadInventoryMap(squads.map((squad) => squad.id))

    return squads.map((squad) => ({
      id: squad.id,
      name: squad.name,
      items: inventoryMap[squad.id] ?? [],
    }))
  }, [])

  return (
    <PanelShell title="物品" description="管理地点、队伍和NPC队伍库存。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>玩家队伍库存</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryList items={playerTeamInventory} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>地点库存总览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {locationInventories.map((group) => (
            <details key={group.id} className="rounded-md border px-2 py-1.5">
              <summary className="cursor-pointer text-sm font-medium">
                {group.name}（{group.items.length}）
              </summary>
              <div className="mt-2">
                <InventoryList items={group.items} />
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>NPC队伍库存总览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {npcSquadInventories.map((group) => (
            <details key={group.id} className="rounded-md border px-2 py-1.5">
              <summary className="cursor-pointer text-sm font-medium">
                {group.name}（{group.items.length}）
              </summary>
              <div className="mt-2">
                <InventoryList items={group.items} />
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </PanelShell>
  )
}
