# Spw Emit

Deterministic collapse of Spw surfaces into **host packets** (plain text, structured copy, publishing briefs, image packs, JSON IR).

This is **not** an LLM runner. It extracts addressable frames (`^["emit"]`, `~#traits`, registers), binds feel-physics dims, and encodes a host codec.

## Commands

```bash
npm run spw -- emit pack <file.spw> [--register voice_web_quiet] \
  [--host plain|mj|web_copy|eng_note|brief|copy|audio|social|json] \
  [--set density.sparse=0.85] [--out out.txt] \
  [--measure] [--strict-positive] [--strict-continuity]

npm run spw -- emit ir <file.spw>          # EmitDocument only (spw.emit/1)
npm run spw -- emit fields <file.spw>      # traits / slots / dims / anchors
npm run spw -- emit registers              # list built-in #voice_* handles
```

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

See also:

- `prompts/substrate/` — PE authoring anatomy
- `prompts/domains/publishing/` — house / title / job schemas
- `prompts/sagas/` + `docs/runtime/md/mutation-sagas.md` — optimizable / fractal mutation sagas (`& => {&}`, slots, profiles)
