" Vim syntax file for SPW (Symbolic Processing Workbench)
" Operator physics semantics:
"   !  action/kinetic      → output, invoke, effect on world      [SpwBoon]
"   @  perspective/observer→ reference frame, position            [SpwBone]
"   ^  integration/fusion  → binding, rising to abstraction       [SpwHonk]
"   ?  wonder/uncertainty  → query, probe, conditional            [SpwBonk]
"   ~  potential           → superposition, possibility space      [SpwPotential]
"   *  value/observable    → measurement, concrete fact           [Type]
"   .  ground              → ground state, context, separator      [Operator]
"   #  vibration/schema    → resonance, self-reference, meta      [PreProc]
"   &  subject/entanglement→ connected entity, overlap            [Identifier]
"   =  set/bias            → assignment, forcing state            [Statement]

syntax clear
syntax case match

" ── Comments ────────────────────────────────────────────────────
syntax match   spwLineComment   '//.*$'                                 display
syntax match   spwHashComment   '^\s*#\s\+[^-].*$'                       display
syntax match   spwPhaseComment  '^\s*#\s*---.*---\s*$'                    display
syntax region  spwBlockComment  start='/\*' end='\*/'

" ── Strings and Phrases ─────────────────────────────────────────
" Strings with contained highlighting for sigils inside quotes
syntax region  spwString  start=+"+ end=+"+ skip=+\\\"+  oneline contains=spwStrSeed,spwStrSigil,spwStrEmDash,spwStrLabNum,spwStrScaffold
syntax region  spwPhrase  start=+'+ end=+'+ skip=+\\'+   oneline
syntax region  spwPhrase  start=+`+ end=+`+ skip=+\\`+   oneline

" Contained: sigils and keywords that appear inside strings
syntax match   spwStrSeed      '\^seed\[\w\+\]'           display contained
syntax match   spwStrSigil     '\(&\|vocab\|![a-z]\)\[\w\+\]'  display contained
syntax match   spwStrEmDash    '—'                         display contained
syntax match   spwStrLabNum    'Lab \d\+\.\d\+'             display contained
syntax keyword spwStrScaffold  scaffold                    contained

" ── Literals ────────────────────────────────────────────────────
syntax match   spwNumber   '-\?\d\+\(\.\d\+\)\?'    display
syntax keyword spwBoolean  true false null

" ── Hole (wildcard) ─────────────────────────────────────────────
syntax match   spwHole  '\<_\>'  display

" ── VALENCES — compound !sigil+word units ────────────────────────
" Order matters: longest match; more specific before generic !
syntax match   spwValBoon  '!boon\>'   display
syntax match   spwValBane  '!bane\>'   display
syntax match   spwValBone  '!bone\>'   display
syntax match   spwValBonk  '!bonk\>'   display
syntax match   spwValHonk  '!honk\>'   display

" ── SEEDS — ^seed[...] declarations ─────────────────────────────
" ^seed is integration (^) applied to a seed label
syntax match   spwSeedKw  '\^seed\>'  display

" ── VOCAB — vocab[...] vocabulary/type declarations ──────────────
syntax match   spwVocabKw  'vocab\[[^\]]*\]'  display

" ── REGISTER ANNOTATIONS — v:N  @profile:X  @region:X ───────────
syntax match   spwRegister  '\<v:\d\+'                          display
syntax match   spwRegister  '@profile:\S\+'                     display
syntax match   spwRegister  '@region:\S\+'                      display
syntax match   spwRegister  '@reg:\S\+'                         display
syntax match   spwRegister  '@ghost:\S*'                        display

" ── PATH ACCESS — word/word (not URL, not comment) ───────────────
syntax match   spwPath  '[A-Za-z_][A-Za-z0-9_]*\(/[A-Za-z_][A-Za-z0-9_]*\)\+'  display

" ── EM-DASH separator ─────────────────────────────────────────────
syntax match   spwEmDash  '—'  display

" ── ANNOTATIONS — ~#name (must precede tilde rule) ───────────────
syntax match   spwAnnotation  '\~#[a-zA-Z_][a-zA-Z0-9_-]*'  display
syntax match   spwFocusTag    '\~#focus'                    display
syntax match   spwTasteTag    '\~#taste'                    display
syntax match   spwGoalTag     '\~#goal'                     display
syntax match   spwStatusTag   '\~#status'                   display

" ── OPERATOR SIGILS — each carries its own semantic register ─────

" ! action/kinetic  (generic, not a valence word)
syntax match   spwSigAction   '!\ze[^bh\[]'    display  " ! before non-valence
syntax match   spwSigAction   '!\ze\['          display  " ![...] frame invocation

" @ perspective/observer
syntax match   spwSigPerspective  '@[a-zA-Z_][a-zA-Z0-9_.]*'  display

" ^ integration/fusion — seed, lift, abstract
syntax match   spwSigIntegration  '\^[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwSigIntegration  '\^'                          display

" ? wonder/uncertainty
syntax match   spwSigWonder  '?match\>'                   display
syntax match   spwSigWonder  '?[a-zA-Z_][a-zA-Z0-9_.]*'  display
syntax match   spwSigWonder  '?\ze[^a-zA-Z_]'             display

" ~ potential/superposition (not followed by #)
syntax match   spwSigPotential  '\~[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwSigPotential  '\~\ze[^#a-zA-Z_]'           display
syntax match   spwSigPotential  '\~$'                         display

" * value/observable — collapse to measurement
syntax match   spwSigValue  '\*'  display

" . ground — separator, path, ground reference
syntax match   spwSpread     '\.\.\.'                           display
syntax match   spwConnector  '\.\.'                             display
syntax match   spwRange      '\d\+\.\.\d\+'                     display
syntax match   spwDotOp      '\.'                               display

" # vibration/schema — resonance, self-reference, meta
syntax match   spwSigSchema  '#[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwSigSchema  '#'                           display

" % measure/observation — collapse to scalar
syntax match   spwSigMeasure  '%\[[^\]]*\]'  display
syntax match   spwSigMeasure  '%'            display

" #-annotation subtypes (before generic #schema)
syntax match   spwAnnotAnchor  '#>[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwAnnotIntent  '#![a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwAnnotLens    '#:[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwAnnotTopic   '\s\zs#[a-zA-Z_][a-zA-Z0-9_]*'  display

" & subject/entanglement
syntax match   spwSigSubject  '&[a-zA-Z_][a-zA-Z0-9_]*'  display
syntax match   spwSigSubject  '&'                           display

" = set/bias — assignment, forcing state
syntax match   spwSigSet  '='  display

" ── ARROW and COMPARISON operators ───────────────────────────────
syntax match   spwArrow      '=>'      display
syntax match   spwArrow      '->'      display
syntax match   spwComparison '[=!<>]=' display

" ── STREAM delimiters << >> ───────────────────────────────────────
syntax match   spwStreamIn   '<<'  display
syntax match   spwStreamOut  '>>'  display

" ── N-RANGE epistemic hedge (( )) ────────────────────────────────
syntax match   spwNRange  '(('  display
syntax match   spwNRange  '))'  display

" ── CONTAINERS — each pair affiliated with a sigil register ──────
"   { } → ^ integration (body/definition)
"   [ ] → # vibration   (frame/reference)
"   ( ) → @ perspective (scope)
"   < > → ? wonder      (capsule/stream)
syntax match   spwBraceOpen   '{'  display
syntax match   spwBraceClose  '}'  display
syntax match   spwBrackOpen   '\[' display
syntax match   spwBrackClose  '\]' display
syntax match   spwParenOpen   '('  display
syntax match   spwParenClose  ')'  display
syntax match   spwAngleOpen   '<\ze[^<=]'    display
syntax match   spwAngleClose  '[^>=!]\zs>'   display

" ── CHUNK BINDER and SEPARATORS ──────────────────────────────────
syntax match   spwChunkBinder  '::'  display
syntax match   spwColon        ':'   display
syntax match   spwComma        ','   display
syntax match   spwSemicolon    ';'   display
syntax match   spwPipe         '|'   display

" ── DOCUMENT FENCE ───────────────────────────────────────────────
syntax match   spwFence  '^---$'  display

" ── WIP-SPECIFIC constructs ──────────────────────────────────────
" ^["section"] — section headers in wip.spw files
syntax match   spwSection  '\^\["\w\+"\]'  display

" >>[YYYY-MM-DD HH:MM] type — log entries in stream
syntax match   spwStreamEntry  '^\s*>>\[.\{-}\]\s\+\w\+\s*—'  display contains=spwStreamType,spwStreamTs
syntax match   spwStreamType   '\]\s\+\zs\w\+\ze\s*—'        display contained
syntax match   spwStreamTs     '>>\[\zs.\{-}\ze\]'          display contained

" Stream action keywords (appear after the timestamp)
syntax keyword spwStreamObserve  observe  contained containedin=spwStreamEntry
syntax keyword spwStreamDecide   decide   contained containedin=spwStreamEntry

" ?[label] open questions
syntax match   spwOpenQuestion  '?\[[^\]]*\]'  display

" ~[N] and ~[N..M] commit entries or array ranges
syntax match   spwCommitEntry  '\~\[\d\+\(\.\.\d\+\)\?\]'  display

" ── HIGHLIGHT LINKS ───────────────────────────────────────────────

" Infrastructure
highlight link spwLineComment    Comment
highlight link spwBlockComment   Comment
highlight link spwHashComment    Comment
highlight link spwString         String
highlight link spwPhrase         String
highlight link spwNumber         Number
highlight link spwBoolean        Boolean
highlight link spwHole           SpwBonk

" Valences — the core moral colorings
highlight link spwValBoon  SpwBoon
highlight link spwValBane  SpwBane
highlight link spwValBone  SpwBone
highlight link spwValBonk  SpwBonk
highlight link spwValHonk  SpwHonk

" Seeds, vocab, and keywords
highlight link spwSeedKw   SpwHonk
highlight link spwVocabKw  SpwVocab

" Registers and annotations
highlight link spwRegister    SpwBone
highlight link spwAnnotation  PreProc
highlight link spwFocusTag    spwFocusTag
highlight link spwTasteTag    SpwTaste
highlight link spwGoalTag     SpwGoal
highlight link spwStatusTag   SpwBone
highlight link spwEmDash      SpwEmDash
highlight link spwPhaseComment SpwPhase

" Semantic sigils — each maps to its register physics
highlight link spwSigAction       SpwBoon       " ! kinetic / fires
highlight link spwSigPerspective  SpwBone       " @ observer / position
highlight link spwSigIntegration  SpwHonk       " ^ fusion / elevation
highlight link spwSigWonder       SpwBonk       " ? uncertainty / probe
highlight link spwSigPotential    SpwPotential  " ~ superposition / possible
highlight link spwSigValue        Type          " * measurement / collapse
highlight link spwSigSchema       PreProc       " # resonance / meta
highlight link spwSigMeasure      SpwMeasure    " % observation / scalar
highlight link spwSigSubject      Identifier    " & entanglement
highlight link spwSigSet          Statement     " = bias / assign

" #-annotation subtypes
highlight link spwAnnotAnchor     SpwAnchor
highlight link spwAnnotIntent     SpwIntent
highlight link spwAnnotLens       SpwLens
highlight link spwAnnotTopic      SpwTopic

" Operators and connectors
highlight link spwArrow      SpwBoon
highlight link spwComparison Operator
highlight link spwConnector  Operator
highlight link spwSpread     SpwSigSubject
highlight link spwRange      Number
highlight link spwDotOp      Comment
highlight link spwPath       SpwBone
highlight link spwPipe       Delimiter

" Streams
highlight link spwStreamIn       SpwBoon
highlight link spwStreamOut      SpwBoon
highlight link spwStreamEntry    SpwStream
highlight link spwStreamType     SpwBonk
highlight link spwStreamTs       SpwStreamTs
highlight link spwStreamObserve  SpwBone
highlight link spwStreamDecide   SpwBoon
highlight link spwNRange         SpwBonk

" Contained string elements
highlight link spwStrSeed      SpwHonk
highlight link spwStrSigil     Identifier
highlight link spwStrEmDash    SpwEmDash
highlight link spwStrLabNum    Number
highlight link spwStrScaffold  SpwPotential

" Container pairs — dimmed versions of their affiliated register
" Containers recede so sigils and content pop
highlight link spwBraceOpen   SpwBraceDim    " ^ integration (dimmed)
highlight link spwBraceClose  SpwBraceDim
highlight link spwBrackOpen   SpwBrackDim    " # vibration/frame (dimmed)
highlight link spwBrackClose  SpwBrackDim
highlight link spwParenOpen   SpwParenDim    " @ perspective (dimmed)
highlight link spwParenClose  SpwParenDim
highlight link spwAngleOpen   SpwAngleDim    " ? wonder/capsule (dimmed)
highlight link spwAngleClose  SpwAngleDim

" Operators — neutral warm grey, distinct from both containers and content
highlight link spwChunkBinder  SpwOperator
highlight link spwColon        SpwPunct
highlight link spwComma        SpwPunct
highlight link spwSemicolon    SpwPunct
highlight link spwFence        Title
highlight link spwSigSet       SpwOperator    " = bias/assign
highlight link spwDotOp        SpwPunct

" WIP constructs
highlight link spwSection       SpwSection
highlight link spwOpenQuestion  SpwQuestion
highlight link spwCommitEntry   SpwCommit

" ── FALLBACK highlight definitions (cterm+gui) ───────────────────
" Core valence pentad — the emotional/cognitive palette (CONTENT layer)
highlight default SpwBoon      guifg=#b8bb26 gui=bold      ctermfg=142 cterm=bold
highlight default SpwBone      guifg=#83a598                ctermfg=109
highlight default SpwBane      guifg=#fb4934 gui=bold      ctermfg=167 cterm=bold
highlight default SpwBonk      guifg=#fe8019                ctermfg=208
highlight default SpwHonk      guifg=#fabd2f gui=bold      ctermfg=214 cterm=bold
highlight default SpwPotential guifg=#b16286 gui=italic    ctermfg=132 cterm=italic

" Container pairs — dimmed echoes of their affiliated register (CONTAINER layer)
highlight default SpwBraceDim  guifg=#b8a100                ctermfg=136
highlight default SpwBrackDim  guifg=#7c6f64                ctermfg=243
highlight default SpwParenDim  guifg=#5b7a70                ctermfg=66
highlight default SpwAngleDim  guifg=#af6840                ctermfg=130

" Operators and punctuation — neutral infrastructure (OPERATOR layer)
highlight default SpwOperator  guifg=#a89984 gui=bold      ctermfg=246 cterm=bold
highlight default SpwPunct     guifg=#665c54                ctermfg=241

" Structural — sections, phases, fences
highlight default SpwSection   guifg=#d3869b gui=bold      ctermfg=175 cterm=bold
highlight default SpwPhase     guifg=#d5c4a1 gui=bold,underline  ctermfg=187 cterm=bold,underline

" Stream — temporal entries and timestamps
highlight default SpwStream    guifg=#928374 gui=italic    ctermfg=245 cterm=italic
highlight default SpwStreamTs  guifg=#a89984                ctermfg=246

" Commit and question entries
highlight default SpwCommit    guifg=#8ec07c                ctermfg=108
highlight default SpwQuestion  guifg=#fe8019 gui=italic    ctermfg=208 cterm=italic

" Annotation tag flavors
highlight default spwFocusTag  guifg=#fe8019 gui=bold      ctermfg=208 cterm=bold
highlight default SpwTaste     guifg=#d3869b gui=italic    ctermfg=175 cterm=italic
highlight default SpwGoal      guifg=#b8bb26 gui=italic    ctermfg=142 cterm=italic

" Vocabulary and keyword colors
highlight default SpwVocab     guifg=#83a598 gui=bold      ctermfg=109 cterm=bold

" Separators
highlight default SpwEmDash    guifg=#665c54                ctermfg=241

" Measure sigil
highlight default SpwMeasure   guifg=#8ec07c gui=italic    ctermfg=108 cterm=italic

" #-annotation subtypes
highlight default SpwAnchor    guifg=#8ec07c gui=underline  ctermfg=108 cterm=underline
highlight default SpwIntent    guifg=#b8bb26 gui=bold      ctermfg=142 cterm=bold
highlight default SpwLens      guifg=#d3869b gui=italic    ctermfg=175 cterm=italic
highlight default SpwTopic     guifg=#a89984                ctermfg=246

let b:current_syntax = 'spw'
