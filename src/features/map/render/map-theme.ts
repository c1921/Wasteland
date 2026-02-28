export type MapThemePalette = {
  background: number
  border: number
  grid: number
}

const FALLBACK_THEME: MapThemePalette = {
  background: 0x0e1218,
  border: 0x2f3d49,
  grid: 0x2a3844,
}

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toPixiHexColor(r: number, g: number, b: number) {
  return (clampColorChannel(r) << 16) | (clampColorChannel(g) << 8) | clampColorChannel(b)
}

function parseHexColor(value: string): number | null {
  const normalized = value.trim().toLowerCase()

  if (!normalized.startsWith("#")) {
    return null
  }

  const hex = normalized.slice(1)

  if (hex.length === 3 || hex.length === 4) {
    const r = Number.parseInt(hex[0] + hex[0], 16)
    const g = Number.parseInt(hex[1] + hex[1], 16)
    const b = Number.parseInt(hex[2] + hex[2], 16)

    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null
    }

    return toPixiHexColor(r, g, b)
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)

    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null
    }

    return toPixiHexColor(r, g, b)
  }

  return null
}

function parseCssChannel(value: string): number | null {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1))

    if (Number.isNaN(percent)) {
      return null
    }

    return clampColorChannel((percent / 100) * 255)
  }

  const numeric = Number.parseFloat(normalized)

  if (Number.isNaN(numeric)) {
    return null
  }

  return clampColorChannel(numeric)
}

function parseRgbColor(value: string): number | null {
  const normalized = value.trim().toLowerCase()
  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/)

  if (!rgbMatch) {
    return null
  }

  const payload = rgbMatch[1].split("/")[0].trim()
  const separator = payload.includes(",") ? "," : /\s+/
  const channels = payload
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)

  if (channels.length < 3) {
    return null
  }

  const r = parseCssChannel(channels[0])
  const g = parseCssChannel(channels[1])
  const b = parseCssChannel(channels[2])

  if (r === null || g === null || b === null) {
    return null
  }

  return toPixiHexColor(r, g, b)
}

function parseUnitInterval(value: string): number | null {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1))

    if (Number.isNaN(percent)) {
      return null
    }

    return percent / 100
  }

  const numeric = Number.parseFloat(normalized)

  if (Number.isNaN(numeric)) {
    return null
  }

  return numeric
}

function parseUnitNumber(value: string): number | null {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1))

    if (Number.isNaN(percent)) {
      return null
    }

    return percent / 100
  }

  const numeric = Number.parseFloat(normalized)

  if (Number.isNaN(numeric)) {
    return null
  }

  return numeric
}

function parseHueInDegrees(value: string): number | null {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  let degrees: number

  if (normalized.endsWith("deg")) {
    degrees = Number.parseFloat(normalized.slice(0, -3))
  } else if (normalized.endsWith("grad")) {
    degrees = Number.parseFloat(normalized.slice(0, -4)) * 0.9
  } else if (normalized.endsWith("rad")) {
    degrees = (Number.parseFloat(normalized.slice(0, -3)) * 180) / Math.PI
  } else if (normalized.endsWith("turn")) {
    degrees = Number.parseFloat(normalized.slice(0, -4)) * 360
  } else {
    degrees = Number.parseFloat(normalized)
  }

  if (Number.isNaN(degrees)) {
    return null
  }

  return ((degrees % 360) + 360) % 360
}

function linearToSrgb(value: number) {
  if (value <= 0) {
    return 0
  }

  if (value >= 1) {
    return 1
  }

  if (value <= 0.0031308) {
    return 12.92 * value
  }

  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055
}

function oklabToPixiHexColor(lightness: number, a: number, b: number) {
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b

  const l = lPrime ** 3
  const m = mPrime ** 3
  const s = sPrime ** 3

  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return toPixiHexColor(
    linearToSrgb(rLinear) * 255,
    linearToSrgb(gLinear) * 255,
    linearToSrgb(bLinear) * 255
  )
}

function parseOklabLikePayload(payload: string): string[] | null {
  const alphaSplit = payload.split("/")

  if (alphaSplit.length === 0 || alphaSplit.length > 2) {
    return null
  }

  const channels = alphaSplit[0]
    .trim()
    .replaceAll(",", " ")
    .split(/\s+/)
    .filter(Boolean)

  if (channels.length < 3) {
    return null
  }

  return channels
}

function parseOklabColor(value: string): number | null {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/^oklab\((.+)\)$/)

  if (!match) {
    return null
  }

  const channels = parseOklabLikePayload(match[1])

  if (!channels) {
    return null
  }

  const lightness = parseUnitInterval(channels[0])
  const a = parseUnitNumber(channels[1])
  const b = parseUnitNumber(channels[2])

  if (lightness === null || a === null || b === null) {
    return null
  }

  return oklabToPixiHexColor(lightness, a, b)
}

function parseOklchColor(value: string): number | null {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/^oklch\((.+)\)$/)

  if (!match) {
    return null
  }

  const channels = parseOklabLikePayload(match[1])

  if (!channels) {
    return null
  }

  const lightness = parseUnitInterval(channels[0])
  const chroma = parseUnitNumber(channels[1])
  const hue = parseHueInDegrees(channels[2])

  if (lightness === null || chroma === null || hue === null) {
    return null
  }

  const hueRadians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(hueRadians)
  const b = chroma * Math.sin(hueRadians)

  return oklabToPixiHexColor(lightness, a, b)
}

function parseCssColor(value: string): number | null {
  return parseHexColor(value) ?? parseRgbColor(value) ?? parseOklchColor(value) ?? parseOklabColor(value)
}

function resolveVarColor(root: HTMLElement, variableName: string): number | null {
  const rootStyle = window.getComputedStyle(root)
  const rawValue = rootStyle.getPropertyValue(variableName).trim()
  const directColor = parseCssColor(rawValue)

  if (directColor !== null) {
    return directColor
  }

  const probe = document.createElement("span")
  probe.style.color = `var(${variableName})`
  probe.style.display = "none"
  root.appendChild(probe)

  const resolvedColor = window.getComputedStyle(probe).color.trim()
  probe.remove()

  return parseCssColor(resolvedColor)
}

export function resolveMapThemePalette(root?: HTMLElement): MapThemePalette {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FALLBACK_THEME
  }

  const resolvedRoot = root ?? document.documentElement
  const background = resolveVarColor(resolvedRoot, "--background") ?? FALLBACK_THEME.background
  const border = resolveVarColor(resolvedRoot, "--border") ?? FALLBACK_THEME.border
  const grid = resolveVarColor(resolvedRoot, "--muted-foreground") ?? FALLBACK_THEME.grid

  return { background, border, grid }
}

export function observeThemeClassChange(
  onChange: () => void,
  root?: HTMLElement
) {
  if (
    typeof MutationObserver === "undefined" ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return () => {}
  }

  const observedRoot = root ?? document.documentElement
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        (
          mutation.attributeName === "class" ||
          mutation.attributeName === "data-base-color"
        )
      ) {
        onChange()
        return
      }
    }
  })

  observer.observe(observedRoot, {
    attributes: true,
    attributeFilter: ["class", "data-base-color"],
  })

  return () => {
    observer.disconnect()
  }
}
