/**
 * Dream schedule — soft, beat-scheduled subtree modeling.
 *
 * "Dreaming" is effect.l0.measure modeling: invent / map / formula / form
 * sequences over a locus tree without workspace write. Construct *play*
 * layers expand + form wrap; mutation stays dry unless explicitly elevated.
 *
 * @see docs/runtime/md/form-play.md
 * @see packages/spw-cli dream / play
 */

export type DreamPhaseId =
  | 'rest'
  | 'invent'
  | 'topo'
  | 'formula'
  | 'form'
  | 'select'
  | 'mutate_dry'
  | 'compose'
  | 'awaken'

export type DreamPhaseEffect = 'effect.l0.measure' | 'effect.l1.memory'

export interface DreamPhase {
  id: DreamPhaseId
  /** Beats to dwell (relative weight) */
  beats: number
  effect: DreamPhaseEffect
  /** Abstract act description */
  act: string
  /** CLI-ish hint (not executed here) */
  hint: string
}

export interface DreamSchedule {
  version: 'spw.dream/1'
  id: string
  description: string
  phases: DreamPhase[]
  /** Total beats in one cycle */
  cycleBeats: number
  loop: boolean
}

export interface DreamTick {
  beat: number
  cycle: number
  phase: DreamPhase
  phaseBeat: number
  progress: number
}

export interface DreamRunnerState {
  schedule: DreamSchedule
  beat: number
  cycle: number
  /** Absolute beat offset into current phase */
  phaseIndex: number
  phaseBeat: number
}

/** Soft overnight-style modeling: rest → invent → form → formula → topo → rest */
export const DREAM_SCHEDULE_SOFT: DreamSchedule = scheduleOf('soft', 'Gentle corpus modeling without write', [
  { id: 'rest', beats: 2, effect: 'effect.l0.measure', act: 'idle hold', hint: 'spw beat -n 1' },
  { id: 'invent', beats: 3, effect: 'effect.l0.measure', act: 'inventory warmth', hint: 'spw invent <roots> --role hub -n 12' },
  { id: 'form', beats: 2, effect: 'effect.l0.measure', act: 'wrap confluence ladder', hint: 'spw form --seq "& => {&} => {&[#label]}"' },
  { id: 'formula', beats: 2, effect: 'effect.l0.measure', act: 'pattern scan', hint: 'spw formula <roots> --top 8' },
  { id: 'topo', beats: 2, effect: 'effect.l0.measure', act: 'hubs + strands', hint: 'spw map <roots> --hubs 8' },
  { id: 'rest', beats: 1, effect: 'effect.l0.measure', act: 'consolidate', hint: 'spw mem status' },
])

/** Construct play: expand template holes then form-label then dry mutate */
export const DREAM_SCHEDULE_PLAY: DreamSchedule = scheduleOf(
  'play',
  'Construct play — expand, wrap/label, dry mutation measure',
  [
    { id: 'form', beats: 2, effect: 'effect.l0.measure', act: 'seed wrap sequence', hint: 'spw form --catalog' },
    { id: 'select', beats: 2, effect: 'effect.l0.measure', act: 'label selection', hint: 'spw form --label my_claim --style hash' },
    { id: 'invent', beats: 2, effect: 'effect.l0.measure', act: 'locate construct sites', hint: 'spw invent <roots> --sort frames' },
    { id: 'mutate_dry', beats: 3, effect: 'effect.l0.measure', act: 'mutation plan only', hint: 'spw pulse <file> --profile layout_canonical' },
    { id: 'formula', beats: 1, effect: 'effect.l0.measure', act: 'measure formulas', hint: 'spw formula <roots> --family hold' },
    { id: 'awaken', beats: 1, effect: 'effect.l0.measure', act: 'report next promote', hint: 'spw analyze <roots> --quiet' },
  ],
)

/** Deep scan: full sense loop once per cycle */
export const DREAM_SCHEDULE_DEEP: DreamSchedule = scheduleOf('deep', 'Full sense loop per cycle', [
  { id: 'invent', beats: 2, effect: 'effect.l0.measure', act: 'inventory', hint: 'spw invent <roots>' },
  { id: 'topo', beats: 3, effect: 'effect.l0.measure', act: 'topography', hint: 'spw map <roots>' },
  { id: 'formula', beats: 2, effect: 'effect.l0.measure', act: 'formulas', hint: 'spw formula <roots>' },
  { id: 'compose', beats: 2, effect: 'effect.l0.measure', act: 'composition model', hint: 'spw analyze <roots>' },
  { id: 'form', beats: 2, effect: 'effect.l0.measure', act: 'form masks', hint: 'spw form --mask endpoints' },
  { id: 'mutate_dry', beats: 2, effect: 'effect.l0.measure', act: 'dry mutation sample', hint: 'spw pulse <hub> --check' },
  { id: 'awaken', beats: 1, effect: 'effect.l0.measure', act: 'wake report', hint: 'spw invent <roots> --role hub -n 5' },
])

export const DREAM_SCHEDULES: Record<string, DreamSchedule> = {
  soft: DREAM_SCHEDULE_SOFT,
  play: DREAM_SCHEDULE_PLAY,
  deep: DREAM_SCHEDULE_DEEP,
}

function scheduleOf(id: string, description: string, phases: DreamPhase[]): DreamSchedule {
  return {
    version: 'spw.dream/1',
    id,
    description,
    phases,
    cycleBeats: phases.reduce((a, p) => a + p.beats, 0),
    loop: true,
  }
}

export function createDreamRunner(schedule: DreamSchedule | string): DreamRunnerState {
  const s = typeof schedule === 'string' ? DREAM_SCHEDULES[schedule] : schedule
  if (!s) throw new Error(`unknown dream schedule: ${schedule}`)
  return {
    schedule: s,
    beat: 0,
    cycle: 0,
    phaseIndex: 0,
    phaseBeat: 0,
  }
}

/** Advance one beat; returns the tick observation. */
export function dreamTick(state: DreamRunnerState): DreamTick {
  const phases = state.schedule.phases
  if (!phases.length) {
    throw new Error('dream schedule has no phases')
  }
  let phase = phases[state.phaseIndex]!
  // If phaseBeat already at end, advance phase first
  if (state.phaseBeat >= phase.beats) {
    state.phaseIndex += 1
    state.phaseBeat = 0
    if (state.phaseIndex >= phases.length) {
      state.phaseIndex = 0
      state.cycle += 1
      if (!state.schedule.loop) {
        // stay on last
        state.phaseIndex = phases.length - 1
      }
    }
    phase = phases[state.phaseIndex]!
  }

  state.beat += 1
  state.phaseBeat += 1
  const progress = phase.beats > 0 ? state.phaseBeat / phase.beats : 1

  return {
    beat: state.beat,
    cycle: state.cycle,
    phase,
    phaseBeat: state.phaseBeat,
    progress,
  }
}

/** Peek current phase without advancing. */
export function dreamPeek(state: DreamRunnerState): DreamPhase {
  return state.schedule.phases[state.phaseIndex] ?? state.schedule.phases[0]!
}

export function listDreamSchedules(): Array<{ id: string; description: string; cycleBeats: number; phases: string }> {
  return Object.values(DREAM_SCHEDULES).map(s => ({
    id: s.id,
    description: s.description,
    cycleBeats: s.cycleBeats,
    phases: s.phases.map(p => p.id).join('→'),
  }))
}
