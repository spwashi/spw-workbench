# Hobby Coder's Guide

Welcome! This guide is for **creative coders, storytellers, tinkerers, and explorers** who want to play with language, create custom domains, or contribute examples to the Spw language workbench.

## Why Contribute as a Hobby Coder?

This project is a playground for creativity:

- **No Installation Needed** — Try online, no setup required
- **Pure Exploration** — You can't break anything; it's all safe interpretation
- **Creative Domains** — Design your own: Music@, Art@, Games@, Magic@, etc.
- **Storytelling** — Write branching narratives using operators as dramatic choices
- **Community** — Share your work, see what others build, remix and fork
- **Learning** — Explore modern software design through creative examples

Your contributions become examples others learn from. Your creative uses inspire new research. Your feedback shapes what makes this fun.

---

## Quick Start (5 Minutes)

### 1. Open the Web App
No installation needed. Just go to: http://localhost:5173 (if you have dev server running)

Or use the deployed version if available.

### 2. Try a Basic Seed
Type this and press Enter:
```spw
^["Hello!"]
```

You see three things:
- **Syntactic View** (left panel) — How it parses: anchor + content
- **Semantic View** (middle panel) — What it means: value with label
- **Pragmatic View** (right panel) — What it does: output "Hello!" to default stream

### 3. Try Interactive Seeds
```spw
?[@input]{
  !["Echo: " .. @input]    # if input is given, echo it
| !["No input!"]           # otherwise, default
}
```

### 4. Switch Interpretation Modes
Press **Ctrl+1/2/3** to see the same seed through different layers:
- **Syntactic** — Structure
- **Semantic** — Meaning
- **Pragmatic** — Effect

Press **Ctrl+Space** for help menu.

**You now understand the basics.** Continue reading for creative possibilities.

---

## Contributor Plan (6 Weeks)

A lightweight plan for building momentum through creative outputs.

**Week 1:** Create 3 small seeds and label what each operator means in your domain.
**Week 2:** Draft a new domain mapping and write one example that shows it off.
**Week 3:** Turn that example into a short tutorial (5-10 steps).
**Week 4:** Share your work in a discussion and collect feedback.
**Week 5:** Refine examples for clarity; add one visual guide or diagram.
**Week 6:** Submit a PR with examples or tutorials in `docs/`.

## Time Budgets

**30-45 min/day**
- 15 min create or refine a seed
- 10 min add a note or tutorial step
- 10 min share or reflect on feedback

**2-3 sessions/week**
- Session A: create examples
- Session B: write a tutorial or domain description
- Session C: polish and submit

---

## The Three Application Domains

Spw is designed to interpret the same seed in different ways. Three domains come built-in:

### 🔌 Hardware@ — Digital Circuits

**Operators mean:**
- `^` = input source or ground
- `!` = signal output or feedback
- `~` = oscillator or clock
- `*` = logic gate (AND)
- `|` = parallel connection or OR
- `&` = series connection or AND

**Example Circuit:**
```spw
^[@signal]{                        # Input signal
  ~[1000]{                         # Oscillate at 1kHz
    * [@clock]                     # AND with clock
  }
  .. ![@output]                    # Chain to output
}
```

**What it means:** Take input signal, oscillate it at 1kHz gated by clock, output result.

**Cool Applications:**
- Describe digital designs for documentation
- Generate waveform descriptions for simulation
- Specify signal flow in audio/video processing

### 🎭 Theatre@ — Performance Scripts

**Operators mean:**
- `^` = protagonist (main character)
- `!` = declaration or revelation
- `?` = dramatic question or choice
- `*` = multiplication (many instances)
- `|` = alternative paths (or)
- `~` = emotional tone or motif

**Example Script:**
```spw
^[@Protagonist]{                   # Main character
  ?[@Will they succeed?]{
    ~[hope]{                       # Emotional tone
      !["I can do this!"]
    }
  | ~[doubt]{
      !["Maybe I'm not ready"]
    }
  }
  .. @Chorus{
    !["The choice is yours!"]      # Chorus comments
  }
}
```

**What it means:** Protagonist faces a dramatic question with hope or doubt, while chorus responds.

**Cool Applications:**
- Write interactive fiction and branching stories
- Design narrative structures for games
- Document character relationships and plot arcs
- Create choose-your-own-adventure formats

### 📡 Broadcast@ — Signal Flow

**Operators mean:**
- `^` = primary source or feed
- `~` = signal modulation or effect
- `*` = multiplexing (many channels)
- `|` = switchover or failover
- `&` = combining or mixing
- `!` = output to air or archive

**Example Broadcast Setup:**
```spw
^[@MainCamera]{                    # Primary feed
  ~[chromakey]{                    # Apply chroma key effect
    * [@SecondaryCamera |          # Include secondary camera
       @Archive]                   # or archive
  }
  .. ![@Broadcast]                 # Broadcast combined signal
}
```

**What it means:** Main camera with chroma key, multiplexed with secondary camera or archive, broadcast combined signal.

**Cool Applications:**
- Describe live broadcast routing
- Design signal flow architectures
- Specify failover and backup strategies
- Document media production pipelines

---

## Create Your Own Domain

Don't like these three? Create your own!

### Step 1: Pick a Domain Name and Theme

Examples:
- Music@ — Musical compositions
- Art@ — Visual art generation
- Games@ — Game rules and mechanics
- Magic@ — Spellcasting systems
- Food@ — Recipes and cooking
- Fashion@ — Outfit composition

### Step 2: Define Operator Meanings

Map each of the 8 operators to your domain:

| Operator | Hardware | Theatre | Broadcast | **Your Domain?** |
|----------|----------|---------|-----------|---|
| `^` | Input/ground | Protagonist | Source feed | ??? |
| `!` | Output/feedback | Declaration | Broadcast | ??? |
| `~` | Oscillator | Tone/motif | Modulation | ??? |
| `<>` | Component | Location | Studio | ??? |
| `?` | Gate | Question | Condition | ??? |
| `*` | AND gate | Multiplication | Multiplex | ??? |
| `\|` | OR gate | Alternative | Switchover | ??? |
| `&` | AND series | Sequence | Combine | ??? |

### Step 3: Design a Seed

Create an example that demonstrates your domain:

```spw
# Example: Music@ domain
^[@Key_C]{                        # Key signature C major
  ~[tempo: 120]{                  # Tempo 120 BPM
    ?[@Verse | @Chorus]{
      ![@Note_C, @Note_E, @Note_G]  # Play chord (C major)
    }
  }
}
```

### Step 4: Share Your Domain

Write a one-paragraph explanation:
- What does each operator mean in your domain?
- What can you express with it?
- What makes it interesting?

---

## Example: Writing a Branching Story

Let's say you want to write an interactive story. Here's how:

### Story Setup
```spw
^[@Player]{                       # You are the protagonist
  ?[@"Do you enter the cave?"]{
    ~[fear]{                      # If you're scared
      !["You turn back"]
    |
    ~[curiosity]{                 # If you're curious
      !["You enter..."]
      .. ?[@"Find treasure?"]{
        !["Gold! You're rich!"]
      | !["Trap! Better luck next time"]
      }
    }
  }
}
```

### What Happens:
1. You face a choice: "Do you enter the cave?"
2. Your emotional response shapes the outcome
3. If curious, you enter and face another choice
4. Each path leads to different outcomes

### Make It Interactive:
- User provides input for `@Player`
- System chooses branches based on `?` conditions
- Taste profiles influence emotional tone (`~`)
- Each choice is recorded and affects later stories

---

## Contribute Low-Barrier Work

You don't need to code to contribute! Here are ways you can help:

### 1. **Write Example Seeds**
Create interesting seeds that demonstrate the language:

```spw
# Example: Weather simulation
^[@Temperature: 72F]{
  ~[humidity: 60%]{
    ?[@Raining?]{
      !["Wet ground"]
    | !["Dry ground"]
    }
  }
}
```

**How to contribute:**
- Write 3-5 example seeds with descriptions
- Save as `.spw` files in `docs/examples/`
- Create a PR with your examples
- Other developers use them for learning

### 2. **Create Tutorials**
Write step-by-step guides for creating things:

```markdown
# Tutorial: Your First Interactive Story

Step 1: Start with a protagonist
^[@Hero]

Step 2: Add a choice
?[@"Fight or flee?"]

Step 3: Add outcomes
{!["You win!"] | !["You escape"]}

Try it! See how the three layers show different interpretations.
```

### 3. **Contribute Creative Domains**
Document a new domain you invented:

```markdown
# Music@ Domain

Operators map to music:
- ^ = key signature
- ~ = tempo and mood
- ! = notes to play
- ? = musical choice

Example:
^[@C_major]{~[120_bpm]{![@C, @E, @G]}}
```

### 4. **Share Your Creations**
- Create a cool seed or domain
- Write it up in an issue or discussion
- Get feedback from the community
- Other people remix and improve it

### 5. **Report What's Confusing**
- Try to use the language
- If something's unclear, file an issue
- Suggest better examples or clearer docs
- Your feedback helps everyone learn

### 6. **Create Visual Guides**
- Draw diagrams of how operators work
- Create flowcharts for story branches
- Make infographics comparing domains
- Share via issue or discussion

---

## Sharing Your Work

### On GitHub
1. **Create a discussion post** — Share your domain or story
2. **Open an issue** — Propose a new example or tutorial
3. **Submit a PR** — Add examples to `docs/examples/`

### In the Community
- Fork the repo and create your own branch
- Collect seeds and domains you create
- Share the link with others

### Future Gallery (Coming)
Eventually there will be:
- Official example gallery
- Community showcase
- Featured creations
- Remix and fork workflows

---

## Tools You Have

### The REPL (Read-Eval-Print Loop)
```
> ^["hello"]
"hello"
> ~[100]{ !["loop"] }
"loop loop loop..."
> ?[@input]{![@input] | !["default"]}
Enter value: xyz
"xyz"
```

### The Visualizer
Three simultaneous views:
1. **Syntactic** — Parse tree structure
2. **Semantic** — Evaluation result
3. **Pragmatic** — Effect/output

Switch with Ctrl+1/2/3.

### The Taste Profiler
See aesthetic metrics for your seeds:
- Minimalism (how few operators)
- Clarity (how readable)
- Rigidity (how constrained)
- Musicality (how rhythmic)
- Plus 4 more...

### Keyboard Shortcuts
```
Ctrl+Space    — Help menu
Ctrl+1/2/3    — Switch layers
Ctrl+Enter    — Evaluate
Ctrl+Shift+C  — Copy to clipboard
Ctrl+?        — Full keyboard map
```

---

## Resources for Learning

### Official Spec
- `lib/spw-v0.1.0-alpha/SPEC.md` — Complete language spec
- `lib/spw-v0.1.0-alpha/applications/` — The 3 domains explained in detail
  - `HARDWARE.md` — Circuits
  - `THEATRE.md` — Stories
  - `BROADCAST.md` — Signal flow

### Example Gallery
- `docs/` directory contains 19+ `.spw` files with patterns:
  - `docs/patterns.spw` — Common patterns
  - `docs/onboarding.spw` — Learning paths
  - `docs/architecture.spw` — Self-describing architecture
  - More in `docs/` directory

### Philosophy
- `VISION.md` — Why we built this
- `docs/design/history.md` — Origin story

### Learning Progressively
The app has 5 skill levels (L1-L5) with progressive disclosure:
- **L1** — Just the basics
- **L2** — Add modifiers
- **L3** — Add containers
- **L4** — Full syntax
- **L5** — Advanced features

Try playing at different levels to see how complexity builds.

---

## Getting Unstuck

### If Something Doesn't Make Sense:
1. Read the relevant part of `SPEC.md`
2. Look for examples in `docs/` .spw files
3. Try it in the REPL and see what happens
4. Open an issue with your question

### If You Have an Idea:
1. Try it in the dev server
2. Open a discussion or issue describing it
3. Someone might build it for you!
4. Or you can learn to code and contribute it

### If You Want to Learn to Code:
This is a great place to start:
- Small domains let you understand pieces at a time
- Good test coverage means you'll know if you break something
- Friendly community will help you learn

---

## Next Steps

1. Open the dev server: `npm run dev`
2. Try creating a few seeds in the REPL
3. Switch between layers (Ctrl+1/2/3) and observe
4. Design your own domain or story
5. Share your creation in a discussion or PR

Or if you want to help in a non-coding way:
1. Read the spec
2. Create tutorial content
3. Design example seeds
4. Share feedback on what's confusing

We're excited to have hobby coders contribute. Your creativity makes this project fun for everyone. 🎉

---

**Back to:** [Contributing Guide Hub](README.md)

---

## Inspiration

**Music Lover?**
→ Design Music@ domain, compose pieces, write tutorials

**Storyteller?**
→ Write branching narratives, design dramatic structures, create RPG systems

**Visual Artist?**
→ Design Art@ domain, write procedural art seeds, create generative examples

**Game Designer?**
→ Create Games@ domain, design rules with operators, build interactive experiences

**Weird Tinkerer?**
→ Invent Magic@, Food@, Fashion@, or whatever domain fascinates you

**Teacher/Educator?**
→ Create learning materials, design tutorial sequences, build example galleries

The language is a tool for thinking. Use it however you want.
