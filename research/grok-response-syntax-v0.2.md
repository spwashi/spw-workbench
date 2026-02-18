# Grok 4.20 Response — Syntax & Normalization Probe (v0.2)

**Date**: 2026-02-17
**Probe**: `src/lang/seeds/probe-grok-4.20.spw`
**Model**: Grok 4 (xAI, 4-agent council)

---

```spw
^seed[Probe.Response.Grok4.20.Spw v:0.2 @profile:Spw.x~#[ops.probe,ops.register_frames,ops.metaphysical,ops.probe, surface.hash] @intent:full_evolution_response]
{_resp
  ## A) Proposal deltas (surface + ONF + fixity + printer + density per Q)
  proposals: #[
    .{ id:`Q1.proj.select`
       delta:`/-family locked. 3 fixities, mode frames, composition (x/a)/b → x/#[a,b] via multi-collect in C3. No new ids.`
       surface: ^seed[Q1.Surface v:0.1 @profile:Spw.b]
{_q1
  doc / title                 ## infix field (default mode=val)
  doc / #[title,author]       ## multi-pick
  doc / ..(0,10)              ## slice (range frame)
  /root/db/users              ## prefix absolute
  doc/                        ## postfix keys/coerce
  doc / key[mode=entry]       ## variant
  (doc / a) / b               ## composition law
}_q1
       onf: ^seed[Q1.ONF v:0.1 @profile:Spw.m]
{_q1m
  /(doc,title)[reg=proj]
  /(doc,#[title,author])[reg=proj]
  /(doc,..(0,10))[reg=proj mode=slice]
  /(root/db/users)[reg=abs]
  /(doc)[reg=keys]
  /(doc,key)[reg=proj mode=entry]
  /(/ (doc,a)[reg=proj],b)[reg=proj]  ## nested; C3 flattens to /(doc,#[a,b])
}_q1m
       fixity:`prefix:/ , infix:/ , postfix:/`
       printer:`Spw.b: space around infix, newline+indent continuation; Spw.l: tight x/key no spaces`
       density: `Spw.b:78chars Spw.l:42chars ratio 1.86`
    },
    .{ id:`Q2.pattern.unify`
       delta:`_ literal hole + _[id=K] named. Dispatch ?(c,p)[mode=unify]. Failure x? → empty.`
       surface: ^seed[Q2.Surface v:0.1 @profile:Spw.b]
{_q2
  Pattern: .{mass:_, charge:_[id=Q], nested: .{spin:_[id=S]}}
  @_m <= ?(Concept, Pattern)[mode=unify]
}_q2
       onf: ^seed[Q2.ONF v:0.1 @profile:Spw.m]
{_q2m
  Pattern: .{mass:_, charge:_[id=Q], nested: .{spin:_[id=S]}}
  @_m <= ?(Concept,Pattern)[mode=unify]
}_q2m
       ebnf:`hole = '_' | '_' '[' 'id' '=' ident ']'`
       tests: `minimal ok; adversarial: _\n[id=K] must bind (ASI carry on [)`
    },
    .{ id:`Q3.parallel.reduce`
       delta:`?< >[reg=chan], &[reg=reduce] commutative (hash order-indep), %[reg=fold] ordered. [par=on][await=all]`
       surface: ^seed[Q3.Surface v:0.1 @profile:Spw.b]
{_q3
  ch: ?<task1,task2>[reg=chan]
  res: &(ch)[reg=reduce par=on await=all]
}_q3
       onf: ^seed[Q3.ONF v:0.1 @profile:Spw.m]
{_q3m
  ch: ?(task1,task2)[reg=chan]
  res: &(ch)[reg=reduce par=on await=all]
}_q3m
    },
    .{ id:`Q4.stream.momentum`
       delta:`5-state machine (Idle,Cary,Resume,Flush,Error). Carry stack. Cont tokens /!#[ [~. Stitch invariant.`
       surface: ^seed[Q4.Surface v:0.1 @profile:Spw.b]
{_q4
  data~
  !process
  /next
}_q4
       pseudo:`state=Idle; if postfix~!&? → Carry(σ,stack); if newline+cont → Resume; else Flush`
       momentum_frame: `[momentum=carry op=/ stack=#[]]`
    },
    .{ id:`Q5.printer.hash`
       delta:`F2 idempotent pretty (Spw.b), C3 token-condensed (Spw.l). 3-hash: surface(with @lock), semantic(ONF), env(momentum). Backtick norm. Frame keys alpha.`
       printer_table: .{
         infix:`"a / b" (b) vs "a/b" (l)`
         newline:`ASI only on cont tokens`
         frame:`.{k:v} alpha k sort`
       }
       checklist:`15-line: 1.normalize backticks 2.alpha keys 3.omit default reg 4... (full in impl)`
       seeds: ^seed[Q5.F2C3 v:0.1 @profile:Spw.b]
{_q5
  x / y / #[a,b]   ## F2
}_q5
       c3:`x/y/#[a,b]`
    },
    .{ id:`Q6.register.runtime`
       delta:`12 sigils → named registers (type=selection|node|... ). $ substrate persistent root, = bias config. Lifecycle open/read/write/seal.`
       table: #[
         .{sigil:`/`, reg:`projection`, type:`selection`, feeds:`? → @ → !`}
         .{sigil:`!`, reg:`motor`, type:`command`}
         ## ... (full 12: @ attn, # schema, . coherence, * output, ^ ltm, & integrate, % salience, $ meta, = bias, ~ mem, ? queue)
       ]
       matrix: .{
         `?` feeds `@` and `&`
         `$` only reads from all, writes env_hash
       }
       seed_flow: ^seed[Q6.Flow v:0.1 @profile:Spw.x~#[ops.register_frames]]
{_q6
  ?(data,pattern)[mode=unify] → @result → !emit → $store[reg=substrate]
}_q6
    },
    .{ id:`Q7.dialect.density`
       delta:`Spectrum q(core) z(typed) b(block) l(line) x(extended) m(ONF). Same expr density ratio.`
       example_concept:`projection+unify`
       dialects: #[
         Spw.q: `/(doc,title)[reg=proj] ?(c,p)[mode=unify]`
         Spw.z: `doc/title ?(c,p)[u]`
         Spw.b: `doc / title ; ?(Concept,Pattern)[mode=unify]`
         Spw.l: `doc/title;?(c,p)[u]`
         Spw.x: `doc / title[mode=val] ; ?(Concept,Pattern)[mode=unify]`
         Spw.m: `/(doc,title)[reg=proj] ; ?(Concept,Pattern)[mode=unify]`
       ]
       ratio_table: .{
         b:120 l:65 x:95 m:80 ratio_max:1.85
       }
    },
    .{ id:`Q8.symmetry.probe`
       delta:`V4 complete on 4 brace stances. ~ openness flip, & dynamism flip. No fifth; V4 exhaustive.`
       table: #[
         `id | ~ | & | ~&`
         `~ | id | ~& | &`
         `& | ~& | id | ~`
         `~& | & | ~ | id`
       ]
       mapping: .{
         `~`: `.{ } ↔ ?<>   @() ↔ #[]`
         `&`: `.{ } ↔ @()   #[] ↔ ?<>`
       }
       surface: ^seed[Q8.Surface v:0.1 @profile:Spw.x~#[ops.probe,ops.metaphysical]]
{_q8
  C: .{mass:42,flow:?<emit>}
  @_def: C.{}      ## coherence
  @_rel: ?(C,~`{}`) ## relational (open)
  @_act: ?(C,&`{}`) ## agentive
  @_ind: C#[]
  @_lim: C?<>
}_q8
       onf: `same + ?(C,~(facet))[reg=probe]`
    }
  ]
  ## B) ONF desugar table (complete touched forms)
  desugars: #[
    `/infix`: `x / y ⇒ /(x,y)[reg=proj]`
    `/post`: `x/ ⇒ /(x)[reg=keys]`
    `/pre`: `/p ⇒ /(p)[reg=abs]`
    `hole`: `_ ⇒ _ ; _[id=K] ⇒ _[id=K]`
    `&reduce`: `&(ch)[reg=reduce]`
    `stance`: `C.{} ⇒ .(C)[reg=coherence] ; ?(C,~`{}`) ⇒ ?(C,~(facet))[reg=probe]`
    `momentum chain`: `data~! ⇒ ~(! (data))`
  ]
  ## C) Seeds: minimal + adversarial (ASI/momentum/holes/mounts)
  tests: #[
    minimal.Q1: ^seed[Test.Min.Q1 v:0.1 @profile:Spw.l] doc/#[t,a];,
    adv.ASI.Q1: ^seed[Test.ASI v:0.1 @profile:Spw.b]
{_asi
doc
/ title
  / author   ## must (doc/title)/author
}_asi
    adv.hole.Q2: ^seed[Test.Hole v:0.1 @profile:Spw.l] .{a:_\n[id=K]};  ## ASI on [ must bind
    adv.mom.Q4: ^seed[Test.Mom v:0.1 @profile:Spw.b] data~\n!proc /next;  ## carry across newlines
    sym.full: ^seed[Q8.Sym v:0.1 @profile:Spw.x~#[ops.probe]] {_s C.{} C@() C#[] C?<> ?(C,~`{}`) ?(C,&`{}`) }_s
  ]
  ## D) Implementation notes: lexer/parser/printer/fuzz/runtime
  notes: .{
    lexer:`dot-in-ident ok unless .{ start; / always sigil (no ident /); cont set=/!#[ [~ for ASI`
    parser:`carry stack (nested momentum); stitch(A+B) reparse partialA + B with frame [momentum=carry]`
    printer:`F2: pretty Spw.b indent 2; C3: Spw.l tight + alpha frames; drift: reparse+reprint idempotent`
    fuzz:`stitch invariant; hash stability semantic=; cross TS/Rust/Py: ONF canonical key`
    runtime:`12 registers open on sigil encounter; $ = persistent (env_hash); visibility: Spw.b full trace, Spw.l compressed`
    migration:`all prior seeds valid; new / family + _ holes backward compat via existing shots`
  }
}
```

---

## ONF Summary Response

```spw
^seed[Probe.Response.Grok4.20.Spw.ONF v:0.2 @profile:Spw.m @intent:canonical_desugar]
{_resp_m
  proposals: #[]  ## flattened ONF of A
  desugars: #[]   ## B as-is
  tests: #[]      ## C minimal only
  notes: .{
    impact:`F2 idempotent preserved; ASI stable on cont set; mount across newlines via carry; hash stable (semantic excludes momentum); cross-deterministic via ONF`
  }
}
```

---

## Adversarial Fuzz Pack

```spw
^seed[Fuzz.ASI.Mount v:0.2 @profile:Spw.l @intent:parser_killer]
x
/ y #[z] ~ !data   ## chain + newline + mount test
```

```spw
^seed[Fuzz.Hole.Mom v:0.2 @profile:Spw.b @intent:edge]
.{ _[id=K]
  /next
}!   ## hole + proj + postfix momentum
```
