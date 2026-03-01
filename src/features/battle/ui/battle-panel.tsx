import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/shared/ui/panel-shell"

export function BattlePanel() {
  return (
    <PanelShell>
      <Card size="sm">
        <CardHeader>
          <CardTitle>战斗准备</CardTitle>
          <CardDescription>
            后续可接入敌我阵容、地形效果和回合日志。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为战斗占位面板，等待战斗系统接入。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
