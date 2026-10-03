import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyzeTopography, buildCorpusProduct, CORPUS_PRODUCT_VERSION } from '@spwashi/spw-seed'
import {
  corpusMemoDir,
  fingerprintCorpusKey,
  getDiskCorpusProduct,
  setDiskCorpusProduct,
  type CorpusMemoKeyParts,
} from './corpus-memo'

const parts: CorpusMemoKeyParts = {
  cwd: '/w',
  roots: ['.spw'],
  hubTop: 24,
  resolvePaths: true,
  indexDepth: 'standard',
  maxFiles: 0,
  productVersion: CORPUS_PRODUCT_VERSION,
  rootRegistry: [['spw', ['.spw']]],
  fileStats: { '.spw/a.spw': '1:2' },
}

describe('fingerprintCorpusKey', () => {
  it('is stable for the same scan inputs', () => {
    expect(fingerprintCorpusKey({ ...parts })).toBe(fingerprintCorpusKey(parts))
  })

  it('changes when the link model (product version) changes', () => {
    expect(fingerprintCorpusKey({ ...parts, productVersion: 'spw.corpus/1' })).not.toBe(
      fingerprintCorpusKey(parts),
    )
  })

  it('changes when the root registry changes', () => {
    const moved: CorpusMemoKeyParts = { ...parts, rootRegistry: [['spw', ['.spw']], ['docs', ['docs']]] }
    expect(fingerprintCorpusKey(moved)).not.toBe(fingerprintCorpusKey(parts))
  })
})

describe('disk corpus memo', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(path.join(os.tmpdir(), 'spw-corpus-memo-test-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('does not serve a product written under an older link model', () => {
    const fingerprint = fingerprintCorpusKey(parts)
    const product = buildCorpusProduct({
      fingerprint,
      roots: parts.roots,
      hubTop: parts.hubTop,
      resolvePaths: parts.resolvePaths,
      indexDepth: parts.indexDepth,
      links: [],
      signals: [],
      topography: analyzeTopography([]),
    })
    setDiskCorpusProduct(product, cwd)
    expect(getDiskCorpusProduct(fingerprint, cwd)?.version).toBe(CORPUS_PRODUCT_VERSION)

    const file = path.join(corpusMemoDir(cwd), `${fingerprint}.product.json`)
    const stale = { ...JSON.parse(readFileSync(file, 'utf8')), version: 'spw.corpus/1' }
    writeFileSync(file, JSON.stringify(stale), 'utf8')

    expect(getDiskCorpusProduct(fingerprint, cwd)).toBeUndefined()
  })
})
