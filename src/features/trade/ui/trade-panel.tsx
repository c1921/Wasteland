import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatBlockedCategories,
  formatNetQuantity,
  TARGET_TYPE_LABEL,
  useTradePanelModel,
} from "@/features/trade/ui/trade-panel-model"
import { PanelShell } from "@/shared/ui/panel-shell"

export function TradePanel() {
  const {
    targetType,
    targets,
    targetId,
    restrictions,
    rows,
    offeredNonCurrencyValue,
    requestedNonCurrencyValue,
    netNonCurrencyValue,
    autoCurrencyPaidValue,
    autoCurrencyPaidEntries,
    autoCurrencyIncomeValue,
    autoCurrencyIncomeEntries,
    validation,
    tradeMessage,
    handleTargetTypeChange,
    handleTargetIdChange,
    handleAdjustItem,
    handleConfirmTrade,
  } = useTradePanelModel()

  return (
    <PanelShell>
      <Card size="sm">
        <CardHeader>
          <CardTitle>交易对象</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trade-target-type">对象类型</Label>
            <Select value={targetType} onValueChange={handleTargetTypeChange}>
              <SelectTrigger id="trade-target-type" className="w-full">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">{TARGET_TYPE_LABEL.location}</SelectItem>
                <SelectItem value="npc-squad">{TARGET_TYPE_LABEL["npc-squad"]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trade-target-id">交易对象</Label>
            <Select value={targetId} onValueChange={handleTargetIdChange}>
              <SelectTrigger id="trade-target-id" className="w-full">
                <SelectValue placeholder="选择对象" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>交易限制</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            对方拒绝购入: {formatBlockedCategories(restrictions.blockedBuyFromPlayer)}
          </p>
          <p>
            对方拒绝卖出: {formatBlockedCategories(restrictions.blockedSellToPlayer)}
          </p>
          <p className="text-muted-foreground text-xs">
            货币不进入交易列表；提交后系统会自动使用货币结算与找零，并提示最终差额。
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>交易明细</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无可交易物品。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物品名</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">对方数量</TableHead>
                  <TableHead className="w-44 text-center">操作按钮</TableHead>
                  <TableHead className="text-right">我的数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const disableDecrease = row.blockedBuyFromPlayer || row.netQuantity <= row.minNet
                  const disableIncrease = row.blockedSellToPlayer || row.netQuantity >= row.maxNet
                  const strikeClassName = row.deprioritized
                    ? "line-through text-muted-foreground"
                    : ""

                  return (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${strikeClassName}`}>{row.name}</span>
                          {row.blockedBuyFromPlayer ? (
                            <Badge variant="secondary">对方拒收</Badge>
                          ) : null}
                          {row.blockedSellToPlayer ? (
                            <Badge variant="secondary">对方拒售</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.value}</TableCell>
                      <TableCell className={`text-right tabular-nums ${strikeClassName}`}>
                        {row.targetQuantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`减少${row.name}`}
                            onClick={() => handleAdjustItem(row.itemId, -1)}
                            disabled={disableDecrease}
                          >
                            -
                          </Button>
                          <span
                            data-testid={`trade-net-${row.itemId}`}
                            className="inline-block min-w-10 text-center tabular-nums"
                          >
                            {formatNetQuantity(row.netQuantity)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`增加${row.name}`}
                            onClick={() => handleAdjustItem(row.itemId, 1)}
                            disabled={disableIncrease}
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${strikeClassName}`}>
                        {row.playerQuantity}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>结算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>我售出总价值: {offeredNonCurrencyValue}</p>
          <p>我购入总价值: {requestedNonCurrencyValue}</p>
          <p>净值: {netNonCurrencyValue}</p>
          <p>
            货币支出总额: {autoCurrencyPaidValue}
            <span className="text-muted-foreground text-sm">（{autoCurrencyPaidEntries}）</span>
          </p>
          <p>
            货币收入总额: {autoCurrencyIncomeValue}
            <span className="text-muted-foreground text-sm">（{autoCurrencyIncomeEntries}）</span>
          </p>
          <p>结算差额: {validation.settlementDelta}</p>
          {validation.ok ? (
            <p className="text-muted-foreground">
              {validation.settlementExact
                ? "当前交易可精确结算，可提交。"
                : validation.settlementNote ?? `当前交易为最接近结算，差额+${validation.settlementDelta}。`}
            </p>
          ) : (
            <p className="text-destructive">{validation.reason}</p>
          )}
          {tradeMessage ? <p className="text-muted-foreground">{tradeMessage}</p> : null}
          <Button onClick={handleConfirmTrade} disabled={!validation.ok}>
            确认交易
          </Button>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
