import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BATTLE_PHASE_LABELS,
  summarizeSquad,
} from "@/features/battle/lib/engine"
import { useBattleNavigation } from "@/features/battle/ui/battle-navigation-store"
import { useAutoBattle } from "@/features/battle/hooks/use-auto-battle"
import { PanelShell } from "@/shared/ui/panel-shell"

export function BattlePanel() {
  const { selectedEncounter } = useBattleNavigation()
  const {
    state,
    unavailableReason,
    outcomeSummary,
    isRunning,
    startBattle,
    stopBattle,
  } = useAutoBattle(selectedEncounter)

  if (!state) {
    return (
      <PanelShell>
        <Card size="sm">
          <CardHeader>
            <CardTitle>自动战斗</CardTitle>
            <CardDescription>战斗已改为地图遭遇驱动，不再使用样本数据。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{unavailableReason ?? "暂无可用遭遇。"}</p>
            <p className="text-muted-foreground">
              操作路径：地图面板 → 选择NPC队伍 → 点击“发起战斗”。
            </p>
          </CardContent>
        </Card>
      </PanelShell>
    )
  }

  const squadA = state.squads[0]
  const squadB = state.squads[1]
  const summaryA = summarizeSquad(squadA)
  const summaryB = summarizeSquad(squadB)
  const isEnded = state.phase === "ended"
  const winnerText =
    state.winnerSide === null
      ? "平局"
      : `${state.winnerSide}方胜利（${state.winnerSide === "A" ? squadA.name : squadB.name}）`

  return (
    <PanelShell>
      <Card size="sm">
        <CardHeader>
          <CardTitle>自动战斗</CardTitle>
          <CardDescription>
            阶段状态机按 Tick 自动结算：接触、火力优势、机动、崩溃、追击。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedEncounter ? (
              <Card size="sm">
                <CardHeader>
                  <CardTitle>遭遇来源</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>敌方队伍: {selectedEncounter.source.squadName}</p>
                  <p>遭遇ID: {selectedEncounter.id}</p>
                  <p>发起时间: {new Date(selectedEncounter.startedAt).toLocaleString()}</p>
                  {outcomeSummary ? <p>结算: {outcomeSummary.message}</p> : null}
                </CardContent>
              </Card>
            ) : null}

            <Card size="sm">
              <CardHeader>
                <CardTitle>战场状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>当前阶段: {BATTLE_PHASE_LABELS[state.phase]}</p>
                <p>Tick: {state.tickCount}</p>
                <p>战斗时长: {state.elapsedSec}s</p>
                {isEnded ? <p>结果: {winnerText}</p> : null}
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>{squadA.name}</CardTitle>
                  <CardDescription>A方</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    存活: {summaryA.aliveCount}/{summaryA.totalCount}
                  </p>
                  <p>平均HP: {summaryA.averageHp}</p>
                  <p>平均士气: {summaryA.averageMorale}</p>
                  <p>压制值: {summaryA.suppression}</p>
                  <p>凝聚度: {summaryA.cohesion}</p>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>{squadB.name}</CardTitle>
                  <CardDescription>B方</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    存活: {summaryB.aliveCount}/{summaryB.totalCount}
                  </p>
                  <p>平均HP: {summaryB.averageHp}</p>
                  <p>平均士气: {summaryB.averageMorale}</p>
                  <p>压制值: {summaryB.suppression}</p>
                  <p>凝聚度: {summaryB.cohesion}</p>
                </CardContent>
              </Card>
            </div>

            <Card size="sm">
              <CardHeader>
                <CardTitle>事件日志</CardTitle>
                <CardDescription>最近 40 条</CardDescription>
              </CardHeader>
              <CardContent>
                {state.log.length > 0 ? (
                  <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
                    {state.log.slice(0, 40).map((entry, index) => (
                      <li key={`${entry.tick}-${entry.phase}-${index}`}>
                        T{entry.tick} [{BATTLE_PHASE_LABELS[entry.phase]}] {entry.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">暂无日志。</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="gap-2 border-t">
          <Button
            type="button"
            variant="default"
            onClick={startBattle}
            disabled={isRunning || isEnded}
          >
            开始自动战斗
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={stopBattle}
            disabled={!isRunning}
          >
            停止
          </Button>
        </CardFooter>
      </Card>
    </PanelShell>
  )
}
