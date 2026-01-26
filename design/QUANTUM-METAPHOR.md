# Quantum Semiotics: A Physics Metaphor for Spw

**Status**: Proposal  
**Origin**: Restoring the original "Action/Wonder" ontology.

## Core Philosophy

Language is not just data processing; it is **physics**. 
- **Operators** are fundamental particles/forces with specific "spin" and "charge".
- **Parsing** is the collapse of a wavefunction (string) into semantic reality.
- **Containers** are fields that constrain interaction.

## Operator Re-Mapping

We propose shifting from the "Geological/Functional" naming (Emit, Ref, Bind) to the "Quantum/Physical" naming.

| Sigil | Old Name | **New Name** | Physics Concept | Original Meaning |
|:---:|:---|:---|:---|:---|
| `!` | Emit | **Action** | Kinetic Energy | Effect on the world |
| `?` | Query | **Wonder** | Uncertainty Principle | Query/Unknown |
| `~` | Iter | **Potential** | Superposition | Possibility space |
| `#` | Reflect | **Vibration** | Resonance | Self-reference/Meta |
| `.` | (None) | **Ground** | Ground State | Termination/Context |
| `*` | Match | **Value** | Observable | Concrete measurement |
| `&` | Parallel | **Subject** | Entanglement | Connected entity |
| `@` | Ref | **Perspective** | Reference Frame | Observer location |
| `^` | Bind | **Integration** | Fusion | Binding energy |

### Molecular Syntax (Composition)
The user notes that **Range (`..`)** is compositionally **Ground (`.`) + Ground (`.`)**.
*   **Physics Interpretation**: If `.` is a "Ground State" (a fixed point/location), then `..` is the **Path** or **Translation** between two grounds.
*   **Parser Implication**: `..` is the *binding energy* between two static contexts. It creates a "trajectory".
*   **Other Composites**:
    *   `<>` (Exchange) = Left + Right spin?
    *   `~#` (Annotation) = Potential + Vibration?

### Technical Notes
- **Ground (`.`)**: Currently used in `..` sequence. We must distinguish `.` (Ground) from `..` (Flow/Chain). Ground likely terminates a statement or anchors it.
- **Subject (`&`)**: Currently a flow operator. Moving it to a primary operator implies "Subject" is a fundamental particle, not just a connector.

## Container Physics

Containers are defined by circumfixes of operators with opposite spin.

| Brackets | Old Name | **New Name** | Field Type |
|:---:|:---|:---|:---|
| `< ... >` | Exchange | **Concept** | Abstract field (Ideas) |
| `( ... )` | Scope | **Scene** | Situational field (Events) |
| `[ ... ]` | Frame | **Mode** | State field (Configurations) |
| `{ ... }` | Body | **Definition** | Structuring field (Laws) |

## Semantic Fields

- **Concept**: A pure idea, unmanifested.
- **Scene**: An idea situated in specific coordinates (time/space).
- **Mode**: The "vibrational state" of the interpreter (e.g., Strict, Loose).
- **Definition**: The internal structure or "mass" of an entity.

## Implementation Path

1.  **Tokenizer Update**:
    - Add `.` (Ground) as distinct token.
    - Promote `&` to Operator.
2.  **Parser Update**:
    - Update AST node types (`ActionNode`, `WonderNode`).
3.  **Visuals**:
    - "Geology" panel becomes "Quantum Geology" or "Physics" panel.
    - Animations reflect particle properties (Action = fast/linear, Potential = wave/oscillating).
