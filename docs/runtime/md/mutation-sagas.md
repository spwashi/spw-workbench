# Mutation Sagas

Customizable, optimizable, fractal-capable **append-only** streams for evolving Spw surfaces (PE style/subject/genre, layout pulse, nested style repos / scenes).

Canon lives under `prompts/sagas/`:

| Surface | Role |
|---------|------|
| `schema.spw` | Step types, coordinates, grades, law |
| `macros.spw` | Holes, slots, templates, `^macro` / `*macro` |
| `fractal.spw` | Nest/fold, `& => {&}`, container roles |
| `optimize.spw` | Metrics, objectives, budgets, search, stop |
| `profiles.spw` | Named packs (`pe_style_lock`, `fractal_merge`, …) |
| `templates/stream.spw` | Copy-me instance |
| `runs/*` | Example / live runs |

Ecology overview: `prompts/script-ecology.spw` (`mutation_sagas`).  
Layout automata: `docs/theory/spw/mutation-automata.spw` + `spw pulse`.

## One-step law

```
#mutate → exactly one coordinate class
#expand → fill holes / macros (not a creative multi-axis leap)
#nest   → child saga same profile, deeper locus
#fold   → merge child via confluence &
#pulse  → plan layout/form ladder (bridge to CLI)
```

Multi-coordinate leaps require explicit `!bonk` and stay quarantined from lock.

## Placeholders & macros

| Token | Meaning |
|-------|---------|
| `_` | Unfilled hole |
| `$_` | Match wildcard (not a lock) |
| `$name` / `${name=default}` | Named slot |
| `&` / `{&}` | Confluence seed / body-hosted merge |
| `^macro["id"]{…}` | Define |
| `*macro[id]{…}` | Expand now |
| `~macro[id]` | Defer expand |

See `prompts/sagas/macros.spw`.

## Fractal: `& => {&}`

From form ladders (`op:&`, preferred product `{&}`):

```
&  =>  {&}  =>  &[a,b]  =>  &(…)  =>  .{&: _}
```

Saga reading:

1. **Seed** merge site  
2. **Wrap** into a body that can host nested style/scene/spells  
3. **Nest** a child profile inside `{&}`  
4. **Fold** measured arms back with valence (`!boon` keep, `!bane` discard, …)

## Optimization loop

```
observe → (expand|mutate|pulse|nest) → measure → decide → … → lock|stop
```

- **Objectives:** `hold_composite`, `layout_safe`, `fractal_hold`, …  
- **Search:** `greedy_one`, `ablate_matrix`, `beam`, `fractal_dfs`, `ladder_walk`  
- **Stop:** fixed point, plateau, budget, lock_ready, bane_streak  

Customize free knobs (objective, budgets, coordinate allow-list) without forking membrane refuse lists — or fork profile explicitly.

## Bridge to tools

```bash
# PE hold sample
npm run spw -- emit pack path/to/pack.spw --host mj --measure

# Layout / ladder pulse
npm run spw -- pulse --profile layout_canonical --check file.spw
npm run spw -- pulse --ladder '&'
npm run spw -- pulse --ladder frame --contour balanced
```

Proposed (not required yet): `spw saga append|expand|optimize` that only appends `>>` lines and prints objective samples.

## Profiles (start here)

| Profile | Use |
|---------|-----|
| `pe_style_lock` | Retune light/density/craft/phrase under emit hold |
| `pe_subject_cast` | Teach subject across organs |
| `line_propagate` | Publish line multi-host locks |
| `layout_canonical` | Safe layout pulse |
| `fractal_merge` | `& => {&}` nest/fold |
| `fractal_style_repo` | Nested phrase banks per organ |

Fork recipe in `profiles.spw`.

## Falsifiers

- Silent three-axis mutate  
- Lock with open required `$slots`  
- Fold that rewrites child history  
- Optimizer that bypasses refuse membrane  
- Infinite nest without `max_depth`
