/**
 * Stdin helpers for REPL / hot-module hosts that pass buffers instead of paths.
 */
import { promises as fs } from 'node:fs'

/** Read full stdin as utf8 (empty string if TTY with no data). */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    // Allow piping empty; REPL hosts usually pipe or use --stdin with data
    return ''
  }
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** True when caller asked for stdin and we should not require file targets. */
export function wantsStdin(args: string[]): boolean {
  return args.includes('--stdin') || args.includes('-')
}

export async function readFileOrStdin(
  filePath: string | null,
  useStdin: boolean,
): Promise<{ source: string; label: string }> {
  if (useStdin) {
    const source = await readStdin()
    return { source, label: '<stdin>' }
  }
  if (!filePath) throw new Error('expected a file path or --stdin')
  const source = await fs.readFile(filePath, 'utf8')
  return { source, label: filePath }
}
