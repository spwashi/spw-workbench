import { describe, expect, it } from 'vitest'
import {
  GeneratedSurfaces,
  REBUILD_GENERATED_COMMAND,
  dirtyWarning,
  generatedSurfaceFromLenses,
  type GeneratedSurface,
} from './generated-surface'

const SURFACE: GeneratedSurface = {
  generator: 'scripts/spw-routes.mjs',
  generatorUri: 'file:///site/scripts/spw-routes.mjs',
  command: 'npm run spw:routes -- --write',
  cwd: '/site',
  sourceUri: 'file:///site/about/domains/bane.land/index.html',
  sourceLabel: 'bane.land/index.html',
}

describe('generated surfaces from lenses', () => {
  it('learns a generated file from its Rebuild lens, and forgets it when the lens goes', () => {
    const surfaces = new GeneratedSurfaces()
    surfaces.learn('file:///a.spw', [
      { command: '', arguments: undefined },
      { command: REBUILD_GENERATED_COMMAND, arguments: [SURFACE] },
    ])
    expect(surfaces.get('file:///a.spw')).toEqual(SURFACE)

    surfaces.learn('file:///a.spw', [{ command: 'spw.showLocations', arguments: [] }])
    expect(surfaces.get('file:///a.spw')).toBeUndefined()
  })

  it('ignores a Rebuild lens whose argument is not a surface', () => {
    expect(generatedSurfaceFromLenses([{ command: REBUILD_GENERATED_COMMAND, arguments: [{ generator: 1 }] }])).toBeNull()
    expect(generatedSurfaceFromLenses([undefined])).toBeNull()
  })

  it('names the source and the rebuild that will replace an edit', () => {
    expect(dirtyWarning('bane.land.spw', SURFACE)).toBe(
      'bane.land.spw is generated from bane.land/index.html. An edit saved here lasts until the next rebuild (npm run spw:routes -- --write) replaces it.',
    )
    expect(dirtyWarning('x.spw', { ...SURFACE, command: null, sourceLabel: null })).toBe(
      'x.spw is generated. An edit saved here lasts until the next rebuild (scripts/spw-routes.mjs) replaces it.',
    )
  })
})
