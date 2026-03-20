import { build } from 'esbuild'
import { promises as fs } from 'node:fs'
import path from 'node:path'
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

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const distDir = path.join(rootDir, 'dist')

const entrypoints: DistEntrypoint[] = [
  { entry: 'scripts/spw.ts', outfile: 'bin/spw.js', executable: true },
  { entry: 'packages/spw-runtime/src/index.ts', outfile: 'index.js' },
  { entry: 'packages/spw-seed/src/parser.ts', outfile: 'parser.js' },
  { entry: 'packages/spw-runtime/src/substrate.ts', outfile: 'substrate.js' },
  { entry: 'packages/spw-runtime/src/resonance.ts', outfile: 'resonance.js' },
  { entry: 'packages/spw-runtime/src/pipeline.ts', outfile: 'pipeline.js' },
]

async function main(): Promise<void> {
  const rootPackage = await readRootPackage()

  await fs.rm(distDir, { recursive: true, force: true })
  await fs.mkdir(path.join(distDir, 'bin'), { recursive: true })

  for (const { entry, outfile, executable } of entrypoints) {
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

  await writeDistPackage(rootPackage)
  await copyIfPresent('README.md')

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

async function writeDistPackage(rootPackage: RootPackageManifest): Promise<void> {
  const distPackage = {
    name: rootPackage.name,
    version: rootPackage.version,
    description: rootPackage.description,
    type: 'module',
    keywords: rootPackage.keywords ?? [],
    repository: rootPackage.repository,
    license: rootPackage.license,
    engines: rootPackage.engines,
    exports: {
      '.': './index.js',
      './runtime': './index.js',
      './parser': './parser.js',
      './substrate': './substrate.js',
      './resonance': './resonance.js',
      './pipeline': './pipeline.js',
    },
    bin: {
      spw: './bin/spw.js',
      'spw-workbench': './bin/spw.js',
    },
  }

  const distPackagePath = path.join(distDir, 'package.json')
  await fs.writeFile(distPackagePath, `${JSON.stringify(distPackage, null, 2)}\n`)
}

async function copyIfPresent(relativePath: string): Promise<void> {
  const sourcePath = path.join(rootDir, relativePath)
  const targetPath = path.join(distDir, path.basename(relativePath))

  try {
    await fs.copyFile(sourcePath, targetPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

await main()
