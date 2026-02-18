# Grok 4.20 Response — Algebra Probe (v0.3)

**Date**: 2026-02-17
**Probe**: `src/lang/seeds/probe-grok-algebra.spw`
**Model**: Grok 4 (xAI, 4-agent council)

---

## Self-Report

```spw
self_report: .{
  model: `Grok 4 (xAI February 2026 context)`,
  multi_agent: true,
  agents: #[Grok(leader), Harper(research/logic), Benjamin(logic/identities/conservation), Lucas(ergonomics/fixity/llm)],
  tools: #[code_execution,browse_page,web_search,x_keyword_search,x_semantic_search,chatroom_send,wait],
  notes: `Council routed: Harper provided Q1/Q2/Q4 annotations + linear-logic/Kleene compares; Benjamin Q1/Q2 matrix/identities drafts; Lucas Q5/Q6 fixity/llm drafts. All invariants from Probe v0.2 adopted. No new sigils/keywords.`
}
```

---

## Main Response

```spw
^seed[Probe.Algebra.Response v:0.3 @profile:Spw.x~#[ops.probe,ops.register_frames,ops.metaphysical,surface.hash] @intent:full_algebra_synthesis]
{_resp
  ## A) 12×12 composition matrix (key non-⊥ only; 42 meaningful cells; ⊥ elsewhere)
  matrix: #[
    . {σ1:`!`,σ2:`~`,rel:`cancel/compose`,law:`!(~(x)) = x`,harper:`linear-logic dereliction`,lucas:`3-sigil chain flag: !~?`},
    . {σ1:`!`,σ2:`@`,rel:`compose`,law:`!( @(s,p) ) = @(s, !p)`},
    . {σ1:`?`,σ2:`@`,rel:`compose`,law:`?( @(s,p) ) = @(s, ?p)`,note:`scope-query`},
    . {σ1:`*`,σ2:`?`,rel:`materialize`,law:`*(?(x)) = x`},
    . {σ1:`&`,σ2:`&`,rel:`assoc+commute`,law:`&(&a,b,c) = &(a,&b,c)`},
    . {σ1:`&`,σ2:`%`,rel:`distribute`,law:`%( &(a,b) ) = &( %(a), %(b) )`},
    . {σ1:`#`,σ2:`&`,rel:`merge`,law:`#(a) & #(b) = #(a & b)`},
    . {σ1:`@`,σ2:`/`,rel:`distribute`,law:`@(x / y) = @(x) / y`},
    . {σ1:`.`,σ2:`σ`,rel:`absorption/id`,law:`.(σ x) = σ(. x)`},
    . {σ1:`$`,σ2:`σ`,rel:`reflect`,law:`$(σ x) = σ($x)`},
    . {σ1:`=`,σ2:`@`,rel:`bias-scope`,law:`=( @(c,x) ) = @( =(c), x )`}
  ]

  ## B) Algebraic identities table
  identities: #[
    .{ id:`A1`, eq:`~( ~(x) ) = x`, status:`axiom`, hash_stable:`yes`, compare:`Klein V4 openness flip`},
    .{ id:`A2`, eq:`&( &(x,y), z ) = &( x, &(y,z) )`, status:`axiom`, hash_stable:`yes`, compare:`linear-logic additive`},
    .{ id:`A3`, eq:`!( ~(x) ) = x`, status:`derived`, hash_stable:`yes`, note:`hydrate-defer cancel`},
    .{ id:`D1`, eq:`!(a & b) = !a & !b`, status:`derived`, hash_stable:`yes`, compare:`! distributes over &`},
    .{ id:`I1`, eq:`*(x,x) = x`, status:`conjecture`, hash_stable:`yes`, compare:`Kleene idempotence`},
    .{ id:`C1`, eq:`.(x) = x`, status:`axiom`, hash_stable:`yes`, compare:`ground identity`},
    .{ id:`Abs1`, eq:`#(#x,x) = #x`, status:`derived`, hash_stable:`yes`}
  ]
  adversarial: ^seed[B.Adversarial v:0.1 @profile:Spw.l]
{_advb
  !(~?(x));??x;data!?#   ## do not auto-simplify; require frames
}_advb

  ## C) Register wiring diagram
  wiring: #[
    . {from:`?`,to:`@`,cond:`always`,trans:`query → focus`},
    . {from:`@`,to:`~`,cond:`defer`,trans:`scope → working_mem`},
    . {from:`~`,to:`#`,cond:`tag`,trans:`defer → schema`},
    . {from:`#`,to:`&`,cond:`merge`,trans:`schema → integrate`},
    . {from:`&`,to:`!`,cond:`force`,trans:`integrate → motor`},
    . {from:`!`,to:`*`,cond:`hydrate`,trans:`motor → output`},
    . {from:`*`,to:`$`,cond:`reflect`,trans:`output → substrate`}
  ]
  layers: .{
    input: #[`?`,`~`],
    process: #[`@`,`#`,`&`,`%`,`=`],
    output: #[`!`,`*`],
    meta: #[`$`,`^`]
  }
  lifecycle: `open (sigil encounter) → read (args) → write (result) → seal (momentum flush)`
  pipeline: ^seed[C.Pipeline v:0.1 @profile:Spw.b]
{_pipe
  ?need @focus ~defer #filter *match !emit   ## ? → @ → ~ → # → * → !
}_pipe

  ## D) Cancel pairs + conservation laws
  cancel_pairs: #[
    `! ~` → `!(~x)=x`,
    `* ?` → `*(?x)=x`,
    `. σ` → absorption for most,
    `~ ~` → `~~x=x`,
    `& &` → `&&x=x`
  ]
  conserved: #[
    .{ qty:`perspective`, analogy:`Noether from Klein V4`, preserved:`under ~ & flips`},
    .{ qty:`mechanical_cost`, analogy:`K vector <M,A,V,E,T,R>`, preserved:`under all rewrites`},
    .{ qty:`semantic_hash`, analogy:`substrate invariant`, preserved:`yes` }
  ]
  connection: `Cut-elimination: !~ and ?* reduce without residual $ cost`

  ## E) Fixity precedence table + 10 ambiguous parses
  precedence: #[
    level1:`braces/frames (tightest)`,
    level2:`postfix ~ ! ? & * / (right-assoc)`,
    level3:`prefix ! @ ^ ? ~ * . # % & $ = (left-assoc)`,
    level4:`infix / = & % (left-assoc)`,
    level5:`momentum carry (newline on /!#[ [~ )`
  ]
  ambiguous_10: #[
    `!x? → !(x?)`,
    `data~! → ~( !(data) )`,
    `?x! → ?(x!)`,
    `x?! → ?( !(x) )`,
    `!~?x → !( ~( ?x ) )`,
    `data!?# → #(?(!(data)))`,
    `!(x?) vs (!x)?`,
    `x / y / z → /( /(x,y), z )`,
    `data~! /next → /( ~( !(data) ), next )`,
    `?(a,b)? → ?(?(a,b))`
  ]
  printer_rules: `Spw.b: space before postfix sigil after ) or ident; Spw.l: no space; always [reg=] on chains >2`

  ## F) LLM-hardened risk table + 3-shot prompt template
  risk: .{
    high: #[`?<> stream vs comparison`, `$ substrate vs var`, `!~? chains`],
    medium: #[`[reg=mode=val]` frames, `_ hole`, `postfix /`],
    low: #[`backtick phrases`, `#[] sets`]
  }
  mitigation: `Require explicit [reg=xxx] in all training; validate ONF roundtrip; Spw.b verbose for generation`
  three_shot: ^seed[F.3Shot.Template v:0.1 @profile:Spw.b]
{_3s
  ## Shot1: S5 Projection family
  doc / title ; doc/ ; /root
  ## Shot2: Cancel law
  !(~42) == 42
  ## Shot3: Pipeline
  ?need @focus ~defer !emit
  ## Now generate valid Spw for: query then hydrate in scope
}_3s
}
```

---

## ONF Summary Response

```spw
^seed[Probe.Algebra.Response.ONF v:0.3 @profile:Spw.m @intent:canonical]
{_resp_m
  matrix: #[]  ## ONF flattened pairs
  identities: #[] ## A1.. with =
  wiring: `?(@(~(#(&(!(*($x))))))`  ## pipeline ONF
  cancel: `!~(x) = x ; *?(x) = x`
  fixity: `!(?(x))`  ## example parse
  risk: .{}  ## no surface
}
```

---

## Adversarial Fuzz Pack

```spw
^seed[Fuzz.Cancel.Chain v:0.3 @profile:Spw.l @intent:parser_killer]
!(~?x!);data~!?#/next   ## momentum + cancel + postfix chain + ASI test
```

```spw
^seed[Fuzz.LLM.Risk v:0.3 @profile:Spw.b @intent:llm_harden_test]
$var?<>  ## high risk $ + <> ; expect ONF $( ?<>(var) )
```
