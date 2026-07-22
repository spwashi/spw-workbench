# Spw Emit

Deterministic collapse of Spw surfaces into **host packets** (plain text, structured copy, publishing briefs, image packs, JSON IR).

This is **not** an LLM runner. It extracts addressable frames (`^["emit"]`, `~#traits`, registers), binds feel-physics dims, and encodes a host codec.

## Commands

```bash
npm run spw -- emit pack <file.spw> [--register voice_web_quiet] \
  [--host plain|mj|web_copy|eng_note|brief|copy|audio|social|json] \
  [--hosts brief,social] \
  [--set density.sparse=0.85] [--out out.txt] \
  [--measure] [--strict-positive] [--strict-continuity] [--strict-style]

# Configurable fractal mutation plan + multi-host emission
npm run spw -- emit fractal <file.spw> --profile fractal_merge \
  [--context production|canon|research|pedagogy|merch|layout|thrift] \
  [--max-depth 2] [--hosts brief,mj,social] \
  [--depth-weights 0.5,0.3,0.2] [--coordinates axis_light,style_phrase] \
  [--ladders op:&,body] [--hold-ratio 0.67] [--measure] [--json]

npm run spw -- emit plan <file.spw> --profile pe_style_lock   # >> stream only
npm run spw -- emit profiles                                   # list fractal profiles
npm run spw -- emit templates                                  # script template catalog
npm run spw -- emit holes <template.spw> [--json]              # open $slots / bare _
npm run spw -- emit expand <template.spw> --bind k=v \         # fill slots (≠ mutate)
  [--strict-holes] [--derivative fork:base:id[:rev]] [--out filled.spw]
npm run spw -- emit ir <file.spw>                              # EmitDocument only
npm run spw -- emit fields <file.spw>
npm run spw -- emit registers
```

### Script templates & fill

Modular trees:

| Tree | Path |
|------|------|
| Catalog | `prompts/templates/index.spw` |
| Fill law | `prompts/templates/fill.spw` |
| Derivatives | `prompts/templates/derivatives.spw` (`in_place` / `fork` / `overlay`) |
| Media experts | `prompts/templates/media/{brief,copy,social,audio,image}.spw` |
| Modalities | `prompts/templates/modality/{still,motion,prose,embodied}.spw` |
| Publish instances | `prompts/templates/publish/{job,title,line}-instance.spw` |
| Math includes | `prompts/math/{hold,literacy,thrift,search}.spw` |
| Saga shells | `prompts/sagas/templates/{stream,nest,line}.spw` |

Expand implements `spw.template/1`: `${name=default}`, `$name`, bare `_` report; expand is **not** mutate.

### Fractal profiles

Named run configs (overlay with CLI knobs):

| Profile | Default context | Role |
|---------|-----------------|------|
| `pe_style_lock` | `production` | shallow style/light retune → mj+copy |
| `fractal_merge` | `production` | nest/fold via `& => {&}` up to depth 3 → brief+mj+social |
| `fractal_style_repo` | `research` | nested phrase banks → mj+copy+eng_note |
| `line_propagate` | `canon` | multi-host publish line, continuity strict-friendly |
| `pe_thrift_social` | `thrift` | sparse social/web, positive-ground default |

Plan steps are deterministic `>>[t] type — body` streams (observe/expand/nest/mutate/measure/fold/emit).

### Dimensional axes & composite score

Abstract axes (tempo, literacy, hold, search, valence, circulation, play, language) are catalogued in:

- theory: `docs/theory/spw/dimensional-axes.spw`
- PE cache: `prompts/substrate/axes.spw`
- machine: `packages/spw-cli/src/emit/axes.ts`

**F2 Hold** (context-sensitive):

\[
\mathrm{Hold}_c = \prod_i h_i^{\alpha_i(c)},\quad h_i \in [0,1]
\]

with \(h\) from positive ground, continuity, style/subject/genre anchors, thrift; \(\alpha(c)\) from `--context` salience (salience reweights attention — **does not rewrite genotype**).

Multi-host / depth arms:

\[
\mathrm{score} = \sum_k w(k)\,\mathrm{Hold}_{c,k}\Big/\sum_k w(k)
\]

**F8 Literacy** snapshot on the run: \(L = \mathrm{Form}\cdot\mathrm{Agency}\cdot\mathrm{Evidence}\cdot\mathrm{Memory}\) (evidence ← hold score; memory ← inject lock flags).

JSON fractal output includes `composite` + `axes` (`spw.axes/1` relationship cache).

## IR (`spw.emit/1`)

- `register` — optional `#voice_*` feel-physics bundle (vendor-free)
- `dims` — tone dimension → pole weights
- `traits` — positive fill slots (`claim`, `proof`, `door`, `goal`, `audience`, …)
- `slots` — host strings (`short_prompt`, `headline`, `hook`, `cold_open`, …)
- `anchors` — continuity strings from `continuity:` / `~#title` / working title
- `includes` — `~"…"` / `~<…>` paths found in the surface
- `meta.positive_ground` — body prefers wanted poles over opposite-lists

## Hosts

| Host | Shape |
|------|--------|
| `plain` | Primary body text |
| `mj` | short / final / negative / flags |
| `web_copy` | claim / proof / door / body |
| `eng_note` | internal handoff |
| `brief` | title, goal, audience, claim, acceptance |
| `copy` | headline, dek, body, door |
| `audio` | cold open, spine, cta, duration |
| `social` | hook, body, door |
| `json` | full IR + pack |

Publishing pack templates live under `prompts/domains/publishing/` (house → title → job).

## Positive ground

Emit measures negation spines (`do not…`, `avoid…`, stacked `not X, not Y`).  
Use `--strict-positive` to fail the run. Image hosts may still carry a separate `negative_prompt` **slot** for structural failures (anatomy, chrome UI)—that is a host channel, not the brief spine.

## Continuity

Title anchors travel across jobs. Declare them as:

```spw
continuity: "Quiet Board | one screen | one verb"
~#title: "Quiet Board"
```

Measure reports `continuity.ok` and missing anchors. Use `--strict-continuity` to fail when any anchor is absent from the composed host text.

## Relation to other tools

| Tool | Role |
|------|------|
| `select` / `query` | Structure / references |
| runtime `precipitateToSpw` | Language pipeline stages → Spw |
| **`emit`** | PE / brief / publishing surfaces → host packets |

## Later

- Theme pack roots / plugin `before_emit` hooks
- Surface macros (`^macro`) expanded into frames before codec
- Optional model-backed fill of `_` holes only (still under IR)
- Editor code lens for axis salience + dual-read museum mode

See also:

- `prompts/substrate/` — PE authoring anatomy
- `prompts/substrate/axes.spw` — dimensional relationship cache + contexts
- `docs/theory/spw/dimensional-axes.spw` — axis algebra, mind formulas F1–F8
- `prompts/templates/` — modular scripts, fill, derivatives, media/modality experts
- `prompts/math/` — algorithmic includes (Hold, literacy, thrift, search)
- `prompts/domains/publishing/` — house / title / job schemas
- `prompts/sagas/` + `docs/runtime/md/mutation-sagas.md` — optimizable / fractal mutation sagas (`& => {&}`, slots, profiles)
