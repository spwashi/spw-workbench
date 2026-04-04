import { promises as fs } from 'node:fs'
import path from 'node:path'

export type SitePreset = 'default' | 'show' | 'installable-book' | 'lore-land'

type CopyDirOptions = {
  overwrite?: boolean
}

export function parseSitePreset(value: string): SitePreset {
  switch (value) {
    case 'default':
      return 'default'
    case 'show':
      return 'show'
    case 'installable-book':
      return 'installable-book'
    case 'lore-land':
    case 'lore.land':
      return 'lore-land'
    default:
      throw new Error(`unknown init preset "${value}"`)
  }
}

export function inferSitePreset(targetAbs: string, explicitPreset?: SitePreset): SitePreset {
  if (explicitPreset) return explicitPreset
  const base = path.basename(path.resolve(targetAbs)).toLowerCase()
  if (base === 'lore.land' || base === 'lore-land') {
    return 'lore-land'
  }
  return 'default'
}

/**
 * Resolves a preset name to the template directory name.
 *
 * Multiple presets can share the same template directory.
 * `show`, `installable-book`, and `lore-land` all resolve
 * to the `installable-book` template — the show scaffold
 * with studio awareness, cascade layers, and precipitation
 * lifecycle. The preset name carries intent (what the
 * producer is making); the template carries structure.
 */
function resolveTemplateName(preset: SitePreset): string {
  switch (preset) {
    case 'show':
    case 'installable-book':
    case 'lore-land':
      return 'installable-book'
    default:
      return preset
  }
}

export async function applyPresetDefaults(
  targetAbs: string,
  templateRoot: string,
  preset: SitePreset,
): Promise<void> {
  if (preset === 'default') return

  const templateName = resolveTemplateName(preset)
  const overlayRoot = path.join(templateRoot, 'presets', templateName)
  await copyDir(overlayRoot, targetAbs, { overwrite: true })
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyDir(src: string, dest: string, options: CopyDirOptions = {}): Promise<void> {
  if (!(await exists(src))) return

  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, options)
      continue
    }

    if (!options.overwrite && (await exists(destPath))) {
      continue
    }

    await fs.mkdir(path.dirname(destPath), { recursive: true })
    await fs.copyFile(srcPath, destPath)
  }
}
