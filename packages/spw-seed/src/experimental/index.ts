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
} from './columns/parse-columns'
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
} from './columns/parse-columns'
export type { LikenessRung } from './columns/likeness'
export { LIKENESS_RUNGS, likeness } from './columns/likeness'
export type { RhymeSurface, Rhyme, RhymeHole, RhymeInstance, RhymeOptions } from './columns/rhymes'
export { findRhymes } from './columns/rhymes'
export type { SurfaceReadings, ReadingsSnapshot, DriftStatus, SurfaceDrift } from './columns/readings'
export { READINGS_SCHEMA, compareReadings, driftedLines, nodeReading, readingsOf, readingsOfColumns } from './columns/readings'

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
  BRACE_CLOSE,
  PAIR_LABELS_SCHEMA,
  braceEdges,
  mirrorPairLabel,
  pairLabelsAround,
  scanBraceEdges,
  scanPairLabels,
} from './pair-labels'

export type { SpokenClause, SpokenLine, SpokenNames, SpokenOptions, SpokenRole } from './spoken'
export { SPOKEN_NAMES, SPOKEN_NAMES_SITE, SPOKEN_SCHEMA, spokenLine, unsaid } from './spoken'
export type { PairClick, PairSound, PairSoundSettings, RenderOptions } from './sound/pair-sound'
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
} from './sound/pair-sound'
export type { EarconProblem, EarconReading, EarconWord, PairMove } from './sound/earcons'
export { EARCON_WORDS, EARCONS_SCHEMA, pairMoves, readEarcons, writeEarcons } from './sound/earcons'
export type { ModalEvent, Texture } from './sound/modal-sound'
export { MODAL_LEVEL_DB, PHRASE_LADDER, TEXTURES, labelPhrase, modalEvents, renderModalClick } from './sound/modal-sound'
export type { ShapeHit, ShapeMatch, ShapePattern, ShapePatternProblem, ShapeSurface } from './columns/shape-match'
export { SHAPE_MATCH_SCHEMA, compileShape, findShape, isShapePattern, matchShape, matchShapeAt, wordHolePattern } from './columns/shape-match'
export { COLUMNS_BYTES_SCHEMA, columnsFromBytes, columnsToBytes } from './columns/columns-bytes'
export type { EditSpan, PairLabelAction, PairLabelEdits, TextEdit } from './structural-edit'
export { STRUCTURAL_EDIT_SCHEMA, applyTextEdits, pairLabelEdits, selectionSpans } from './structural-edit'
export type { SettingsLine, SettingsProblem, SettingsProblemKind, SettingsTerm, SettingsVocabulary, SettingWord } from './settings-line'
export { SETTINGS_LINE_SCHEMA, readSettingsLine, readSettingsTerms, writeSettingsLine } from './settings-line'
export type { GpuColumns, UniformField, UniformLayout } from './columns/gpu-pack'
export { GPU_PACK_SCHEMA, GPU_ROW_FIELDS, GPU_ROW_WORDS, WGSL_ROW, columnsToGpu, packUniforms, uniformLayout, wgslStruct } from './columns/gpu-pack'
export type { NumberForm, NumberProblem } from './number-form'
export { NUMBER_FORM_SCHEMA, isNumberForm, readNumberForm } from './number-form'
export { settingNumber } from './settings-line'
/** Measures of rendered samples (power at a frequency, band share, RMS, onset, spectra), under one name. */
export * as soundMeasures from './sound/measure'
export type { Derivation, Dimension, Quantity, QuantityProblem } from './quantity'
export { QUANTITY_SCHEMA, UNITS, cssNumber, derivationFactor, readDerivation, readQuantity } from './quantity'
export type { CssPropertiesOptions } from './css-properties'
export { CSS_PROPERTIES_SCHEMA, cssDeclarations, writeCssProperties } from './css-properties'
/** Dimensional analysis: rationals, SI dimensions and units, quantity sheets written in Spw, π groups and natural units. */
export type { BaseQuantity, Dimension as PhysicalDimension, Quantity as PhysicalQuantity } from './physics/dimension'
export { BASE as PHYSICAL_BASE, UNITS as PHYSICAL_UNITS, dimension as physicalDimension, formatDimension, isDimensionless, sameDimension, unit as physicalUnit } from './physics/dimension'
export type { QuantitySheet, SheetProblem, SheetProblemKind } from './physics/sheet'
export { QUANTITY_SHEET_SCHEMA, evaluate as evaluateQuantity, formatUncertain, inUnit, readQuantitySheet, uncertainty } from './physics/sheet'
export type { NaturalReading, PiGroup } from './physics/analysis'
export { inNaturalUnits, piGroups } from './physics/analysis'
export { SI_CONSTANTS } from './physics/constants'
export type { Rational } from './physics/rational'
export { nullSpace, parseRational, rational, solve as solveRational } from './physics/rational'
