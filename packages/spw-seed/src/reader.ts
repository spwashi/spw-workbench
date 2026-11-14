/**
 * The browser-safe slice of seed a reader needs: lexing, parsing, token
 * filters, and the particle tables. Nothing here reaches a node built-in, so
 * the parser release can bundle the editor's reading functions on top of it;
 * the package index stays the full surface for node consumers.
 *
 * @see packages/spw-lsp/src/reader.ts — the reading functions built on it
 */

export { lex } from './lexer/lex'
export { DEFAULT_REVISION_ID_FORMS, REVISION_ID_FORMS, revisionIdForm, type RevisionIdForm } from './lexer/commit-ref'
export { parse, parseExpression } from './parser'
export { significantTokens } from './types/token'
export { deixisTable } from './canonical/particles'
export { slotHash } from './canonical/slot-hash'
export type { SlotHash, SlotHashOptions } from './canonical/slot-hash'
export {
  readLine,
  readAt,
  writeLine,
  writeAt,
  joinParts,
  SLOT_KEYS,
  SLOT_NAMES,
  BONDS,
} from './line'
export type { SlotReading, SlotSpan, LinePart, LineCompound, LineChange, SlotKey, PairKey, BondName } from './line'
// A line said in names, and a click for every brace: for a page that gives a line an accessible name or a sound.
// Both are experimental (spw.spoken/1, spw.pair-sound/1) and may change.
export { SPOKEN_NAMES, SPOKEN_NAMES_SITE, SPOKEN_SCHEMA, spokenLine, unsaid } from './experimental/spoken'
export type { SpokenClause, SpokenLine, SpokenNames, SpokenOptions, SpokenRole } from './experimental/spoken'
export { PAIR_LABELS_SCHEMA, scanPairLabels, pairLabelsAround } from './experimental/pair-labels'
export type { BraceEdge, BracePair, PairLabelScan } from './experimental/pair-labels'
export { PAIR_SOUND, PAIR_SOUND_SCHEMA, labelTimbre, pairSound, renderClick, renderPairSound, renderPhrase, wavBytes } from './experimental/sound/pair-sound'
export type { PairClick, PairSound, PairSoundSettings } from './experimental/sound/pair-sound'
export { EARCON_WORDS, EARCONS_SCHEMA, pairMoves, readEarcons, writeEarcons } from './experimental/sound/earcons'
export type { EarconProblem, EarconReading, PairMove } from './experimental/sound/earcons'
export { MODAL_LEVEL_DB, TEXTURES, labelPhrase, modalEvents } from './experimental/sound/modal-sound'
// A settings line read against a host's own vocabulary (spw.settings-line/1, experimental).
export { SETTINGS_LINE_SCHEMA, readSettingsLine, readSettingsTerms, settingNumber, writeSettingsLine } from './experimental/settings-line'
export { NUMBER_FORM_SCHEMA, isNumberForm, readNumberForm } from './experimental/number-form'
// Quantities with dimensions, derivations between words, and a settings line written as CSS custom properties.
export { QUANTITY_SCHEMA, UNITS, readDerivation, readQuantity } from './experimental/quantity'
export type { Derivation, Dimension, Quantity } from './experimental/quantity'
export { CSS_PROPERTIES_SCHEMA, cssDeclarations, writeCssProperties } from './experimental/css-properties'
export type { NumberForm, NumberProblem } from './experimental/number-form'
export type { SettingsLine, SettingsProblem, SettingsTerm, SettingsVocabulary, SettingWord } from './experimental/settings-line'
export type { ModalEvent, Texture } from './experimental/sound/modal-sound'
export type { Token } from './types'
export type { ASTNode } from './types/ast'
