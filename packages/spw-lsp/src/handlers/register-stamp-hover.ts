/**
 * Hover for a `[reg=name]` stamp: what the stamp says that its bracket does not.
 *
 * Reads the line with seed's stamp reader, so a stamp inside a string is not
 * hovered. The text states what is true today: a restating stamp tells a
 * reader nothing, and an informing one is read by no tool yet.
 */
import { readRegisterStamps, type RegisterStamp } from '@spwashi/spw-seed'

export interface RegisterStampHover {
  markdown: string
  start: number
  end: number
}

function describe(stamp: RegisterStamp): string {
  const head = `**\`[reg=${stamp.name}]\`** — *register stamp*\n\n`
  if (!stamp.closes) return `${head}Follows no closing bracket, so it names a register on its own.\n`
  if (stamp.restates) {
    return `${head}Restates its bracket: \`${stamp.closes}\` already closes a ${stamp.shape}. A reader learns nothing from this stamp.\n`
  }
  return `${head}Informs: names \`${stamp.name}\` where \`${stamp.closes}\` says ${stamp.shape}. No tool reads an informing register yet.\n`
}

/** The hover for the stamp under `character` on `line`, or null when none is there. */
export function registerStampHover(line: string, character: number): RegisterStampHover | null {
  for (const stamp of readRegisterStamps(line)) {
    if (character < stamp.start || character >= stamp.end) continue
    const also = Object.entries(stamp.also)
    const more = also.length ? `\nAlso carries ${also.map(([key, value]) => `\`${key}=${value}\``).join(', ')}.\n` : ''
    return { markdown: describe(stamp) + more, start: stamp.start, end: stamp.end }
  }
  return null
}
