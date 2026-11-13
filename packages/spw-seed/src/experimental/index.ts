export type {
  ExpRuntimeHook,
  ExpStatus,
  SyntaxCatalogEntry,
} from './syntax-catalog'
export {
  SYNTAX_CATALOG,
  getSyntaxCatalogEntry,
  listSyntaxCatalog,
  formatCatalogEntryMarkdown,
} from './syntax-catalog'

export type { ScannedExpRef, ExperimentalScan } from './scan-refs'
export { scanExperimentalRefs, resolveCitedCatalogEntries } from './scan-refs'

export type {
  ColumnBands,
  ColumnName,
  ColumnsReceipt,
  ParseColumns,
  ParseColumnsJson,
} from './parse-columns'
export {
  COLUMN_KINDS,
  COLUMN_NAMES,
  PARSE_COLUMNS_SCHEMA,
  childRows,
  columnsFromJson,
  columnsOfAst,
  columnsToJson,
  parseColumns,
  reduceUp,
  wordUnit,
} from './parse-columns'
export type { LikenessRung } from './likeness'
export { LIKENESS_RUNGS, likeness } from './likeness'
export type { RhymeSurface, Rhyme, RhymeHole, RhymeInstance, RhymeOptions } from './rhymes'
export { findRhymes } from './rhymes'
export type { SurfaceReadings, ReadingsSnapshot, DriftStatus, SurfaceDrift } from './readings'
export { READINGS_SCHEMA, compareReadings, driftedLines, nodeReading, readingsOf, readingsOfColumns } from './readings'

export type {
  BraceEdge,
  BraceEvent,
  BraceKind,
  BracePair,
  PairCloseSpelling,
  PairLabelOptions,
  PairLabelScan,
  PairScanDirection,
} from './pair-labels'
export {
  PAIR_LABELS_SCHEMA,
  braceEdges,
  mirrorPairLabel,
  pairLabelsAround,
  scanBraceEdges,
  scanPairLabels,
} from './pair-labels'

export type { SpokenClause, SpokenLine, SpokenNames, SpokenOptions, SpokenRole } from './spoken'
export { SPOKEN_NAMES, SPOKEN_NAMES_SITE, SPOKEN_SCHEMA, spokenLine, unsaid } from './spoken'
export type { PairClick, PairSound, PairSoundSettings, RenderOptions } from './pair-sound'
export {
  OVERTONES,
  PAIR_SOUND,
  PAIR_SOUND_SCHEMA,
  labelTimbre,
  pairSound,
  renderClick,
  renderPairSound,
  renderPhrase,
  wavBytes,
} from './pair-sound'
export type { EarconProblem, EarconReading, EarconWord, PairMove } from './earcons'
export { EARCON_WORDS, EARCONS_SCHEMA, pairMoves, readEarcons, writeEarcons } from './earcons'
export type { ModalEvent, Texture } from './modal-sound'
export { MODAL_LEVEL_DB, PHRASE_LADDER, TEXTURES, labelPhrase, modalEvents, renderModalClick } from './modal-sound'
export type { ShapeHit, ShapeMatch, ShapePattern, ShapePatternProblem, ShapeSurface } from './shape-match'
export { SHAPE_MATCH_SCHEMA, compileShape, findShape, isShapePattern, matchShape, matchShapeAt, wordHolePattern } from './shape-match'
export { COLUMNS_BYTES_SCHEMA, columnsFromBytes, columnsToBytes } from './columns-bytes'
