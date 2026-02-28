import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/shared/ui/panel-shell"

export function ItemsPanel() {
  return (
    <PanelShell title="物品" description="管理库存、装备和消耗品。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>仓库清单</CardTitle>
          <CardDescription>
            后续接入物品分类、稀有度、叠加和快捷使用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为物品占位面板，等待道具系统接入。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
