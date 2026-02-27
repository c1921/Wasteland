export const Gender = {
  Male: "male",
  Female: "female",
  Unknown: "unknown",
} as const

export type Gender = (typeof Gender)[keyof typeof Gender]

export type CharacterAbilities = {
  strength: number
  agility: number
  intelligence: number
  endurance: number
}

export type CharacterSkills = {
  shooting: number
  melee: number
  stealth: number
  scouting: number
  survival: number
  medical: number
  engineering: number
  salvaging: number
  driving: number
  negotiation: number
  taming: number
  crafting: number
}

export type CharacterProfile = {
  id: string
  name: string
  gender: Gender
  abilities: CharacterAbilities
  skills: CharacterSkills
}

export class Character {
  readonly id: string
  readonly name: string
  readonly gender: Gender
  readonly abilities: CharacterAbilities
  readonly skills: CharacterSkills

  constructor(profile: CharacterProfile) {
    this.id = profile.id
    this.name = profile.name
    this.gender = profile.gender
    this.abilities = { ...profile.abilities }
    this.skills = { ...profile.skills }
  }

  toJSON(): CharacterProfile {
    return {
      id: this.id,
      name: this.name,
      gender: this.gender,
      abilities: { ...this.abilities },
      skills: { ...this.skills },
    }
  }
}
