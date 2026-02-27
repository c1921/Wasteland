import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/components/panels/panel-shell"

export function TeamPanel() {
  return (
    <PanelShell title="队伍" description="管理角色编组、状态和战术分工。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>编队状态</CardTitle>
          <CardDescription>
            后续可展示成员属性、装备槽、行动值和疲劳度。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为队伍占位面板，等待角色系统接入。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
