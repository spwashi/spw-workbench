/**
 * spw fingerprint — node-count contour of one expression or surface.
 */

import { promises as fs } from 'node:fs'
import process from 'node:process'
import { fingerprintSource, type FormFingerprint } from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { meta } from './view'

interface FingerprintArgs {
  help: boolean
  json: boolean
  stdin: boolean
  expression: boolean
  target?: string
}

function parseArgs(argv: string[]): FingerprintArgs {
  const tokens = argv[0] === 'fingerprint' || argv[0] === 'fp' ? argv.slice(1) : argv
  const parsed: FingerprintArgs = {
    help: false,
    json: false,
    stdin: false,
    expression: false,
  }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token === '--help' || token === '-h') parsed.help = true
    else if (token === '--json') parsed.json = true
    else if (token === '--stdin') parsed.stdin = true
    else if (token === '--expr' || token === '-e') {
      parsed.expression = true
      parsed.target = tokens[++i]
    } else if (token.startsWith('--expr=')) {
      parsed.expression = true
      parsed.target = token.slice('--expr='.length)
    } else if (token.startsWith('-')) {
      throw new Error(`spw fingerprint: unknown flag ${token}`)
    } else if (!parsed.target) parsed.target = token
    else throw new Error(`spw fingerprint: unexpected argument ${token}`)
  }
  return parsed
}

export function printFingerprintHelp(): void {
  printHelpPage({
    name: 'fingerprint',
    summary: 'Count AST node types for one expression or surface',
    usage: [
      'spw fingerprint <file.spw> [--json]',
      'spw fingerprint --expr \'noun[mode]{parts}<scene>\'',
      'cat surface.spw | spw fingerprint --stdin',
    ],
    groups: [
      {
        title: 'Options',
        lines: [
          '--expr, -e TEXT   Fingerprint a standalone expression',
          '--stdin           Read source from stdin',
          '--json            Envelope with byType, signature, completeness',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Signature is sorted Type=count. Completeness rides along so prose fallback cannot look like the taught shape.',
          'Alias: spw fp',
        ],
      },
    ],
    examples: [
      'spw fingerprint --expr \'cauldron[garden]{sow ~> tend ~> harvest}\'',
      'spw fingerprint docs/examples/spw/form-sequence.spw --json',
    ],
  })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function printHuman(fp: FormFingerprint): void {
  meta(
    `# spw fingerprint  nodes=${fp.total} complete=${fp.complete} prose=${fp.proseFallback} root=${fp.actualRootKind ?? 'none'}`,
  )
  if (!fp.signature) {
    console.log('(empty contour)')
    return
  }
  console.log(fp.signature)
}

export async function runSpwFingerprintCli(argv: string[]): Promise<void> {
  let args: FingerprintArgs
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }

  if (args.help || (!args.target && !args.stdin)) {
    printFingerprintHelp()
    if (!args.help) process.exitCode = 2
    return
  }

  let source: string
  try {
    if (args.stdin) source = await readStdin()
    else if (args.expression) source = args.target ?? ''
    else source = await fs.readFile(args.target!, 'utf8')
  } catch (error) {
    console.error(`spw fingerprint: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 3
    return
  }

  const fp = fingerprintSource(source, { expression: args.expression })
  if (args.json) {
    console.log(formatJsonEnvelope('fingerprint', fp, {
      total: fp.total,
      complete: fp.complete,
      proseFallback: fp.proseFallback,
    }))
    return
  }
  printHuman(fp)
  if (!fp.success || fp.proseFallback) process.exitCode = 1
}
