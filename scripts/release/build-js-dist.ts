import { build } from 'esbuild'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

type RootPackageManifest = {
  name: string
  version: string
  description?: string
  type?: string
  keywords?: string[]
  repository?: { type?: string; url?: string }
  license?: string
  engines?: Record<string, string>
}

type DistEntrypoint = {
  entry: string
  outfile: string
  executable?: boolean
}

type DistLibraryEntrypoint = DistEntrypoint & {
  declarationFacade: string
  declarationSource: string
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const distDir = path.join(rootDir, 'dist')
const declarationAliasTargets = {
  '@spw/seed': 'types/spw-seed/src/index.d.ts',
  '@spw/seed/parser': 'types/spw-seed/src/parser.d.ts',
  '@spw/runtime': 'types/spw-runtime/src/index.d.ts',
  '@spw/runtime/pipeline': 'types/spw-runtime/src/pipeline.d.ts',
  '@spw/runtime/substrate': 'types/spw-runtime/src/substrate.d.ts',
  '@spw/runtime/resonance': 'types/spw-runtime/src/resonance.d.ts',
} as const

const cliEntrypoints: DistEntrypoint[] = [
  { entry: 'scripts/spw.ts', outfile: 'bin/spw.js', executable: true },
]

const libraryEntrypoints: DistLibraryEntrypoint[] = [
  {
    entry: 'packages/spw-runtime/src/index.ts',
    outfile: 'index.js',
    declarationFacade: 'index.d.ts',
    declarationSource: 'types/spw-runtime/src/index.d.ts',
  },
  {
    entry: 'packages/spw-seed/src/parser.ts',
    outfile: 'parser.js',
    declarationFacade: 'parser.d.ts',
    declarationSource: 'types/spw-seed/src/parser.d.ts',
  },
  {
    entry: 'packages/spw-runtime/src/substrate.ts',
    outfile: 'substrate.js',
    declarationFacade: 'substrate.d.ts',
    declarationSource: 'types/spw-runtime/src/substrate.d.ts',
  },
  {
    entry: 'packages/spw-runtime/src/resonance.ts',
    outfile: 'resonance.js',
    declarationFacade: 'resonance.d.ts',
    declarationSource: 'types/spw-runtime/src/resonance.d.ts',
  },
  {
    entry: 'packages/spw-runtime/src/pipeline.ts',
    outfile: 'pipeline.js',
    declarationFacade: 'pipeline.d.ts',
    declarationSource: 'types/spw-runtime/src/pipeline.d.ts',
  },
]

async function main(): Promise<void> {
  const rootPackage = await readRootPackage()
  const jsEntrypoints = [...cliEntrypoints, ...libraryEntrypoints]

  await fs.rm(distDir, { recursive: true, force: true })
  await fs.mkdir(path.join(distDir, 'bin'), { recursive: true })

  for (const { entry, outfile, executable } of jsEntrypoints) {
    const absEntry = path.join(rootDir, entry)
    const absOutfile = path.join(distDir, outfile)

    await build({
      entryPoints: [absEntry],
      outfile: absOutfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      sourcemap: true,
      target: ['node20'],
      logLevel: 'silent',
      tsconfig: path.join(rootDir, 'tsconfig.json'),
    })

    if (executable) {
      await normalizeExecutable(absOutfile)
    }
  }

  await emitDeclarations(libraryEntrypoints)
  await rewriteDeclarationAliases()
  await writeDeclarationFacades(libraryEntrypoints)
  await writeDistPackage(rootPackage, libraryEntrypoints)
  await copyIfPresent('README.md')
  await copyIfPresent('scripts/spw-lib.sh')
  await copyIfPresent('.agents/skills/spw-commit-review/scripts/poll-review.sh')
  await copyIfPresent('packages/spw-cli/templates/init', 'templates/init')

  console.log(`Built JS dist v${rootPackage.version} at ${path.relative(rootDir, distDir)}`)
}

async function readRootPackage(): Promise<RootPackageManifest> {
  const packagePath = path.join(rootDir, 'package.json')
  const source = await fs.readFile(packagePath, 'utf8')
  return JSON.parse(source) as RootPackageManifest
}

async function normalizeExecutable(filePath: string): Promise<void> {
  let source = await fs.readFile(filePath, 'utf8')

  if (source.startsWith('#!/usr/bin/env tsx')) {
    source = source.replace('#!/usr/bin/env tsx', '#!/usr/bin/env node')
  } else if (!source.startsWith('#!/usr/bin/env node')) {
    source = `#!/usr/bin/env node\n${source}`
  }

  await fs.writeFile(filePath, source)
  await fs.chmod(filePath, 0o755)
}

async function emitDeclarations(entrypoints: DistLibraryEntrypoint[]): Promise<void> {
  const configPath = path.join(rootDir, 'tsconfig.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

  if (configFile.error) {
    throw new Error(formatTypeScriptDiagnostics([configFile.error]))
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, rootDir)
  const declarationRoot = path.join(distDir, 'types')
  const program = ts.createProgram({
    rootNames: entrypoints.map(({ entry }) => path.join(rootDir, entry)),
    options: {
      ...parsed.options,
      declaration: true,
      emitDeclarationOnly: true,
      declarationMap: false,
      noEmit: false,
      rootDir: path.join(rootDir, 'packages'),
      outDir: declarationRoot,
    },
  })

  const preEmitDiagnostics = ts.getPreEmitDiagnostics(program)
  if (preEmitDiagnostics.length > 0) {
    throw new Error(formatTypeScriptDiagnostics(preEmitDiagnostics))
  }

  const result = program.emit()
  if (result.emitSkipped) {
    throw new Error(formatTypeScriptDiagnostics(result.diagnostics))
  }
}

async function writeDeclarationFacades(entrypoints: DistLibraryEntrypoint[]): Promise<void> {
  await Promise.all(
    entrypoints.map(async ({ declarationFacade, declarationSource }) => {
      const targetPath = path.join(distDir, declarationFacade)
      const relativeImport = normalizeDeclarationImport(path.relative(path.dirname(targetPath), path.join(distDir, declarationSource)))
      const source = `export * from '${relativeImport}'\n`
      await fs.writeFile(targetPath, source)
    }),
  )
}

async function rewriteDeclarationAliases(): Promise<void> {
  const declarationRoot = path.join(distDir, 'types')
  const files = await collectDeclarationFiles(declarationRoot)

  await Promise.all(
    files.map(async (filePath) => {
      let source = await fs.readFile(filePath, 'utf8')

      for (const [specifier, target] of Object.entries(declarationAliasTargets)) {
        const resolvedImport = normalizeDeclarationImport(path.relative(path.dirname(filePath), path.join(distDir, target)))
        source = source
          .replaceAll(`'${specifier}'`, `'${resolvedImport}'`)
          .replaceAll(`"${specifier}"`, `"${resolvedImport}"`)
      }

      await fs.writeFile(filePath, source)
    }),
  )
}

async function collectDeclarationFiles(dirPath: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectDeclarationFiles(entryPath)))
      continue
    }
    if (entry.name.endsWith('.d.ts')) {
      files.push(entryPath)
    }
  }

  return files
}

function normalizeDeclarationImport(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join('/')
  const withoutExtension = normalized.endsWith('.d.ts') ? normalized.slice(0, -'.d.ts'.length) : normalized
  return withoutExtension.startsWith('.') ? withoutExtension : `./${withoutExtension}`
}

function formatTypeScriptDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => rootDir,
    getCanonicalFileName: (fileName) => fileName,
    getNewLine: () => '\n',
  })
}

async function writeDistPackage(rootPackage: RootPackageManifest, entrypoints: DistLibraryEntrypoint[]): Promise<void> {
  const entryExport = (entrypoint: DistLibraryEntrypoint) => ({
    types: `./${entrypoint.declarationFacade}`,
    default: `./${entrypoint.outfile}`,
  })

  const distPackage = {
    name: rootPackage.name,
    version: rootPackage.version,
    description: rootPackage.description,
    type: 'module',
    keywords: rootPackage.keywords ?? [],
    repository: rootPackage.repository,
    license: rootPackage.license,
    engines: rootPackage.engines,
    types: './index.d.ts',
    exports: {
      '.': entryExport(entrypoints[0]),
      './runtime': entryExport(entrypoints[0]),
      './parser': entryExport(entrypoints[1]),
      './substrate': entryExport(entrypoints[2]),
      './resonance': entryExport(entrypoints[3]),
      './pipeline': entryExport(entrypoints[4]),
    },
    bin: {
      spw: './bin/spw.js',
      'spw-workbench': './bin/spw.js',
    },
    files: [
      '.agents',
      'README.md',
      'bin',
      'index.js',
      'index.js.map',
      'index.d.ts',
      'parser.js',
      'parser.js.map',
      'parser.d.ts',
      'pipeline.js',
      'pipeline.js.map',
      'pipeline.d.ts',
      'resonance.js',
      'resonance.js.map',
      'resonance.d.ts',
      'scripts',
      'substrate.js',
      'substrate.js.map',
      'substrate.d.ts',
      'templates',
      'types',
    ],
  }

  const distPackagePath = path.join(distDir, 'package.json')
  await fs.writeFile(distPackagePath, `${JSON.stringify(distPackage, null, 2)}\n`)
}

async function copyIfPresent(relativePath: string, targetRelativePath: string = relativePath): Promise<void> {
  const sourcePath = path.join(rootDir, relativePath)
  const targetPath = path.join(distDir, targetRelativePath)

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.cp(sourcePath, targetPath, { recursive: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

await main()
