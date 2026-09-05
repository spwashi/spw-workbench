import { writeSync } from 'node:fs'

export type QueryStage = 'discovery' | 'read' | 'parse' | 'evaluate' | 'format'
interface SourceTiming {
  file: string
  bytes: number
  elapsedMs: number
  parseOutcome: string
}

/** Query-local receipts. Synchronous writes survive a blocked parser/event loop. */
export class QueryProfile {
  private readonly started = performance.now()
  private readonly stages: Record<QueryStage, number> = {
    discovery: 0, read: 0, parse: 0, evaluate: 0, format: 0,
  }
  private readonly slowest: SourceTiming[] = []
  private processed = 0
  private bytes = 0
  discovered = 0

  emit(event: string, data: object): void {
    writeSync(2, `spw query profile ${JSON.stringify({ event, ...data })}\n`)
  }

  enter(stage: QueryStage, file: string, bytes: number): void {
    this.emit('enter', { stage, file, bytes })
  }

  finishStage(stage: QueryStage, started: number, file?: string): void {
    const elapsedMs = performance.now() - started
    this.stages[stage] += elapsedMs
    this.emit('stage', { stage, file, elapsedMs, discovered: this.discovered })
  }

  complete(source: SourceTiming): void {
    this.processed++
    this.bytes += source.bytes
    this.slowest.push(source)
    this.slowest.sort((a, b) => b.elapsedMs - a.elapsedMs)
    this.slowest.length = Math.min(5, this.slowest.length)
    this.emit('source', source)
  }

  report(): void {
    this.emit('report', {
      discovered: this.discovered, processed: this.processed, bytes: this.bytes,
      stagesMs: this.stages, elapsedMs: performance.now() - this.started,
      slowest: this.slowest,
    })
  }
}
