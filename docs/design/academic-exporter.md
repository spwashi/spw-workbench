# Academic Exporter (`spw-to-latex`)

## The Goal
The Spw Workbench is a "differential field" for cognitive mapping, but the user's trajectory aims toward institutional rigor (Materials Science and Engineering grad school). 

The goal of this exporter is to automatically compile a chain of `.spw` documents—which function as both codebase documentation and personal journals—into a rigorous, mathematically typeset, citation-ready academic format (e.g., a PDF compiled via LaTeX).

## Metaphorical Architecture

In Spw, an idea moves through states of matter:
1. `~` (Potential): A raw markdown note or `// @spw:todo`
2. `.` (Subject): A structured `.spw` node
3. `#` (Ground): A resonated, immutable axiom

The Academic Exporter is the **crystallization engine**. It takes the flowing narrative of the codebase and freezes it into a formal, archival structure.

## Compilation Pipeline

### 1. The Sheaf Collector
The exporter starts by parsing an entry `.spw` file and traversing its `#[reference]` arrays to pull in all related contexts. It uses the `SpwLanguageService` to build a localized AST graph.

### 2. The Valence Filter
Academic papers do not need every codebase detail. The exporter uses the BBBH pentad (`quality.spw`) to filter content:
*   **Boon (Germane load):** Becomes the "Methods" and "Results" sections. Pure, structural truths.
*   **Bane (Extraneous load):** Excluded, or relegated to "Limitations & Future Work".
*   **Bone (Intrinsic load):** Becomes the "Background / Theory" section.
*   **Honk/Bonk:** Becomes the "Discussion" section (where anomalies and thresholds are analyzed).

### 3. Operator Translation mapping

Spw operators map beautifully to formal logic and mathematics. The exporter translates Spw syntax strings directly into LaTeX math environments:

| Spw Syntax | LaTeX Formalism | Academic Meaning |
| :--- | :--- | :--- |
| `#[a, b]` | $\mathcal{U} = \{a, b\}$ | Domain boundary / Set definition |
| `&[a, b]` | $a \oplus b$ | Emergent composition / Alloying |
| `~X` | $\Psi(X)$ | Potential state function |
| `#X` | $X \equiv \mathbf{I}$ | Axiomatic Grounding |
| `?(X) -> Y`| $\forall x \in X, P(x) \implies y$ | Structural invariant |
| `%X` | $\|X\|$ | Normalized magnitude |

### 4. The `[reg=facet]` Extractor
Any block bounded by `.{ ... }[reg=facet]` is treated as a formally defined struct or tensor. 

```spw
.{
  sigma_xx = 100
  tau_xy = 25
}[reg=stress_tensor]
```
*Compiles to:*
$$
\sigma = \begin{bmatrix} 100 & 25 \\ 25 & 0 \end{bmatrix}
$$

## User Experience (CLI)

```bash
# 1. Author research inside Spw
vim docs/research/notes/metaphorical-convergence.spw

# 2. Run the exporter skill
npm run export:academic docs/research/notes/metaphorical-convergence.spw --format latex

# 3. Output
# -> Generating AST graph...
# -> Filtering by valence... (2 boons, 1 bonk found)
# -> Translating operators...
# ✓ docs/research/exports/metaphorical-convergence.tex created
```

## Next Steps for Implementation
1.  **AST Walker:** Create a new visitor pattern in `src/lang/semantic` that outputs LaTeX strings instead of ONF.
2.  **Valence Pruner:** Write a utility that trims an AST based on the `boon/bane` annotations of its parent scopes.
3.  **Template Engine:** Integrate a basic `.tex` string templater with standard IEEE or Nature formatting macros.
