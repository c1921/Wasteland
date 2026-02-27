import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  type Character,
  type CharacterAbilities,
  type CharacterSkills,
  Gender,
} from "@/features/character/types"
import { cn } from "@/lib/utils"

type CharacterRosterProps = {
  characters: Character[]
}

const genderLabelMap: Record<Gender, string> = {
  [Gender.Male]: "男",
  [Gender.Female]: "女",
  [Gender.Unknown]: "未知",
}

const abilityLabels: Array<{ key: keyof CharacterAbilities; label: string }> = [
  { key: "strength", label: "力量" },
  { key: "agility", label: "敏捷" },
  { key: "intelligence", label: "智力" },
  { key: "endurance", label: "耐力" },
]

const skillLabels: Array<{ key: keyof CharacterSkills; label: string }> = [
  { key: "shooting", label: "射击" },
  { key: "melee", label: "近战" },
  { key: "stealth", label: "潜行" },
  { key: "scouting", label: "侦察" },
  { key: "survival", label: "生存" },
  { key: "medical", label: "医疗" },
  { key: "engineering", label: "工程" },
  { key: "salvaging", label: "拆解" },
  { key: "driving", label: "驾驶" },
  { key: "negotiation", label: "谈判" },
  { key: "taming", label: "驯化" },
  { key: "crafting", label: "制作" },
]

function clampAbility(value: number) {
  return Math.max(0, Math.min(100, value))
}

function clampSkill(value: number) {
  return Math.max(0, Math.min(20, value))
}

export function CharacterRoster({ characters }: CharacterRosterProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    characters[0]?.id ?? null
  )

  const selectedCharacter = useMemo(() => {
    if (characters.length === 0) {
      return null
    }

    return characters.find((character) => character.id === selectedId) ?? characters[0]
  }, [characters, selectedId])

  if (characters.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>角色栏</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">暂无角色数据。</p>
        </CardContent>
      </Card>
    )
  }

  if (!selectedCharacter) {
    return null
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_1fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle>角色栏</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {characters.map((character) => {
            const isActive = character.id === selectedCharacter.id

            return (
              <Button
                key={character.id}
                type="button"
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "h-auto w-full justify-start px-2 py-2 text-left",
                  !isActive && "text-foreground"
                )}
                onClick={() => setSelectedId(character.id)}
              >
                <span className="truncate font-medium">{character.name}</span>
              </Button>
            )
          })}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
          <CardTitle className="text-base">{selectedCharacter.name}</CardTitle>
          <Badge variant="secondary">{genderLabelMap[selectedCharacter.gender]}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              能力
            </h3>
            <div className="space-y-2">
              {abilityLabels.map((ability) => {
                const value = clampAbility(selectedCharacter.abilities[ability.key])

                return (
                  <div key={ability.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>{ability.label}</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                    <div className="bg-muted h-1.5 rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-[width]"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              技能
            </h3>
            <div className="space-y-2">
              {skillLabels.map((skill) => {
                const value = clampSkill(selectedCharacter.skills[skill.key])

                return (
                  <div key={skill.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>{skill.label}</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                    <div className="bg-muted h-1.5 rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-[width]"
                        style={{ width: `${(value / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
