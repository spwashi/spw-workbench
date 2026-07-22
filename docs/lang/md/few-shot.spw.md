# Few-shot Spw cards

Tiny syntax samples. For progressive learning (CLI, form, editors) see
[docs/learn/README.md](../../learn/README.md) and the [cheat sheet](../../learn/cheat-sheet.md).

Prefer `#` line comments in Spw culture (not `//`).

```spw
# Action inject
!["hello world"]
```

```spw
!boon["welcome"] .. @out
```

```spw
^["counter"]: 0
```

```spw
^["greeting"]{
  !["Hello"]
  @out
}
```

```spw
?[@ready]{
  !boon["success"]
| !bane["waiting"]
}
```

```spw
~["repeat": 3]{
  ![@i]
}
```

```spw
<>["request", "response"]
```

```spw
!boon.honk["critical success"]
```

```spw
(isolated:
  ^["local"]: 42
  ![@local]
)
```

```spw
^["process"]{
  !["start"]
  .. =["mode": "strict"]
  .. ?[@valid]{
       !boon["proceed"]
       .. @out
     | !bane["abort"]
       .. @error
     }
}
```

```spw
# Form sequence (notation — confluence wrap → label)
# & => {&} => {&[#claim]}
&
{&}
{&[#claim]}
```

```spw
# Template slots (expand fills; mutate is separate)
^["card"]{
 title: $title
 claim: ${claim=measure first}
 open: _
}
```

```spw
# Path + root refs (gf / documentLink)
~"./form-sequence.spw"
# @docs/learn/README.md  — when @docs root is declared
```

```spw
# Measure + trait
~#goal: "learn first"
$%[register.bank_size]
```

## Next

| Time | Go |
|------|-----|
| 15 min | [learn/path.md](../../learn/path.md#15-minutes) |
| 1 hour | [learn/worked-cli.md](../../learn/worked-cli.md) |
| Forms | [examples/spw/form-sequence.spw](../../examples/spw/form-sequence.spw) |

```spw
~[@items]{
  ?[@_.active]{
    ![@_.name]
  | !bone["skipped"]
  }
}
```

```spw
!["A"] & !["B"] & !["C"]
```

```spw
^["config"]{
  =["timeout": 30]
  =["retries": 3]
  =["verbose": false]
}
```

```spw
*[@selection]{
  "option_a": !["chose A"]
| "option_b": !["chose B"]
| "default": !bone["no match"]
}
```

```spw
Hardware@{
  ^["amp"]{
    !["Vin"]
    .. =["gain": 10]
    .. @["Vout"]
  }
}
```

```spw
Theatre@{
  !honk["A stranger enters"]
  .. <>["Hero", "Stranger"]
  .. ?["trust"]{
       !boon["alliance formed"]
     | !bane["conflict begins"]
     }
  .. @["scene ends"]
}
```

```spw
^["api_handler"]{
  !sys["You are a helpful assistant."]
  !ctx[@document]
  !usr[@question]
  @emit["response"]
}
```

```spw
@users
  .. ?[status == "active"]
  .. ?[role == "admin"]
  .. ^["limit": 10]
  .. @out
```

```spw
^template["email"]{
  !boon["Dear " .. _name .. ","]
  !bone[_body]
  !bone[_signature?]
  @out
}
```

```spw
^["nested"]{
  (outer:
    ^["x"]: 1
    (inner:
      ^["y"]: 2
      ![@x] .. ![@y]
    )
  )
}
```

```spw
^["pipeline"]{
  ![@input]
  .. ^["step_1"]{ !["transform"] }
  .. ^["step_2"]{ ?[@valid]{ @out | @retry } }
  .. ^["step_3"]{ =["complete": true] }
  .. @out["result"]
}
```

```spw
Fractal@{
  ^["koch"]{
    !boon["base_line"]
    ~["depth": infinite]{
      ^["scale": "/3"]
      .. *["segments": 4]{ !boon["edge"] }
      .. <>["connect"]
      .. ?[@depth_limit]{ =boon["converged"] }
    }
  }
}
```

```spw
#taste[6,4,5,8,7,6|8,7,8,7,6,9,8,7→7.6:Literate]
```

```spw
^["seed"]{
  #version: "0.1.0"
  #domain: Cognitive@
  
  !honk["attention"]
  .. ^["chunk"]
  .. ~["rehearse": 3]{ ![@chunk] }
  .. =["encoded"]
  .. @["memory"]
}
```