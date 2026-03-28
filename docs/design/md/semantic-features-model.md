# Semantic Features Model

**Date**: 2026-01-18
**Status**: Design specification (pre-implementation)
**Related**: `docs/design/research-episodes-plan.md`, `docs/audits/ontological-geometry-audit.md`, Phase 1-3 implementation, [Literate UI Pattern](../../../.spw/patterns/literate-ui.spw) — operator gestures map to image schemas (? = FOCUS/probe, ! = FORCE/action, ~ = NEAR-FAR/defer)

---

## Purpose `@spw:term`

Replace culturally-specific visual metaphors (e.g., "temperature") with **cognitively grounded semantic features** that:

1. **Ground abstract concepts in embodied cognition** (Lakoff & Johnson, 1980; Gärdenfors, 2000)
2. **Support linguistic capacity evolution** through metaphor-based reasoning
3. **Enable multimodal AI integration** via embedding space compatibility
4. **Provide reduction/expansion handles** for different levels of detail
5. **Future-proof for CSS voice and ambient media** integration

---

## Theoretical Foundation

### Embodied Cognition `@spw:term`

**Core Premise**: Abstract reasoning emerges from bodily experience via **image schemas** (Lakoff, 1987).

Image schemas are pre-linguistic patterns derived from sensorimotor experience:
- **FORCE**: pushing, pulling, resistance, enablement
- **NEAR-FAR**: proximity, distance, containment, approach/withdrawal
- **FOCUS**: attention allocation, foreground/background, clarity/blur

These schemas ground conceptual metaphors:
- "Visual mode is PASSIVE" → low force, observational stance
- "Editing mode is ACTIVE" → high force, manipulative engagement
- "Structural mode is NAVIGATING" → medium force, scanning orientation

### Conceptual Spaces (Gärdenfors, 2000) `@spw:term`

**Core Premise**: Concepts are regions in quality dimension spaces, not discrete symbols.

Quality dimensions:
- **Continuous**: values range from 0.0 to 1.0
- **Metric**: distance between points is meaningful (semantic similarity)
- **Compositional**: dimensions combine to form feature vectors

**Benefits**:
- **Interpolation**: smooth transitions between states (e.g., visual → editing)
- **Extrapolation**: AI can generate novel states not in training data
- **Similarity**: compute semantic distance between UI states
- **Learning**: multimodal models can map natural language to feature space

---

## Semantic Feature Space

### Three Core Dimensions `@spw:term`

Instead of hardcoded color values, we parameterize visual semantics across three **quality dimensions**:

```typescript
interface SemanticFeatures {
  /**
   * INTENSITY: Force dynamics (active ↔ passive)
   *
   * Image schema: FORCE
   * Embodied grounding: Muscular effort, movement vigor
   *
   * Low (0.0-0.3):   Passive observation, receptive state
   * Medium (0.4-0.6): Neutral navigation, scanning
   * High (0.7-1.0):   Active manipulation, transformative state
   *
   * Visual encoding:
   * - Saturation: base_sat × (0.5 + 0.5 × intensity)
   * - Border weight: 1px + 2px × intensity
   * - Glow intensity: intensity × 0.6
   *
   * Audio encoding (future):
   * - Volume: 50% + 50% × intensity
   * - Tempo: 60bpm + 80bpm × intensity
   */
  intensity: number  // 0.0 - 1.0

  /**
   * PROXIMITY: Spatial relation (engaged ↔ distant)
   *
   * Image schema: NEAR-FAR
   * Embodied grounding: Physical distance, touch/no-touch
   *
   * Low (0.0-0.3):   Detached observer, outside looking in
   * Medium (0.4-0.6): Present participant, nearby but not touching
   * High (0.7-1.0):   Immersed actor, hands-on manipulation
   *
   * Visual encoding:
   * - Opacity: 0.5 + 0.5 × proximity
   * - Z-index elevation: 10 × proximity
   * - Shadow depth: 20px × proximity
   *
   * Audio encoding (future):
   * - Reverb (inverse): 100% - 100% × proximity
   * - Stereo width: 100% × proximity
   */
  proximity: number  // 0.0 - 1.0

  /**
   * CLARITY: Perceptual sharpness (focused ↔ diffuse)
   *
   * Image schema: FOCUS
   * Embodied grounding: Visual acuity, attentional spotlight
   *
   * Low (0.0-0.3):   Background awareness, peripheral vision
   * Medium (0.4-0.6): Distributed attention, context scanning
   * High (0.7-1.0):   Focused scrutiny, foveal detail
   *
   * Visual encoding:
   * - Blur: 10px × (1 - clarity)
   * - Contrast: 0.5 + 0.5 × clarity
   * - Text anti-aliasing: smoothing inversely proportional to clarity
   *
   * Audio encoding (future):
   * - High-pass filter: 1000Hz × clarity (remove low freq at high clarity)
   * - Presence: clarity × 0.8
   */
  clarity: number  // 0.0 - 1.0
}
```

### Modal Context Profiles

```typescript
const MODAL_PROFILES: Record<ModalContext, SemanticFeatures> = {
  /**
   * Visual Semantic Mode
   *
   * Cognitive stance: Receptive observer
   * Metaphor: "Looking without touching"
   * Typical actions: Navigate, inspect, read
   */
  'visual-semantic': {
    intensity: 0.3,  // Low force - passive observation
    proximity: 0.6,  // Medium engagement - present but not manipulating
    clarity: 0.8,    // High focus - sharp perceptual detail
  },

  /**
   * Editing Semantic Mode
   *
   * Cognitive stance: Active transformer
   * Metaphor: "Hands-on manipulation"
   * Typical actions: Delete, modify, insert, transform
   */
  'editing-semantic': {
    intensity: 0.9,  // High force - active transformation
    proximity: 1.0,  // Full engagement - immersed in action
    clarity: 0.7,    // Medium focus - attending to action, not fine details
  },

  /**
   * Structural Mode
   *
   * Cognitive stance: Navigator/surveyor
   * Metaphor: "Scanning the landscape"
   * Typical actions: Navigate tree, expand/collapse, jump to location
   */
  'structural': {
    intensity: 0.5,  // Neutral force - locomotion without manipulation
    proximity: 0.4,  // Medium distance - surveying from slight remove
    clarity: 0.9,    // High focus - scanning for landmarks/structure
  },
}
```

---

## Linguistic Capacity: Metaphor Grounding

### Linguistic Anchors `@spw:term`

Each dimension maps to **conceptual metaphors** that humans naturally use to reason about abstract states.

```typescript
const LINGUISTIC_ANCHORS = {
  intensity: {
    dimension: 'FORCE',

    // Primary metaphors (Lakoff & Johnson)
    metaphors: [
      'strong/weak',
      'active/passive',
      'energetic/calm',
      'forceful/gentle',
    ],

    // Action verbs grounded in force dynamics
    verbs: {
      increase: ['intensify', 'amplify', 'energize', 'drive', 'push'],
      decrease: ['calm', 'soften', 'ease', 'release', 'relax'],
    },

    // Adjectives for linguistic description
    adjectives: {
      low: ['gentle', 'subdued', 'passive', 'restful', 'calm'],
      medium: ['moderate', 'balanced', 'steady', 'flowing'],
      high: ['forceful', 'vigorous', 'energetic', 'driving', 'surging'],
    },

    // 5-point scale for progressive disclosure
    scale: ['resting', 'stirring', 'moving', 'driving', 'surging'],
  },

  proximity: {
    dimension: 'NEAR-FAR',

    metaphors: [
      'close/distant',
      'engaged/detached',
      'inside/outside',
      'involved/removed',
    ],

    verbs: {
      increase: ['approach', 'engage', 'enter', 'immerse', 'merge'],
      decrease: ['withdraw', 'disengage', 'exit', 'detach', 'remove'],
    },

    adjectives: {
      low: ['distant', 'detached', 'remote', 'removed', 'external'],
      medium: ['nearby', 'participating', 'present', 'involved'],
      high: ['intimate', 'immersed', 'merged', 'embedded', 'fused'],
    },

    scale: ['removed', 'observing', 'participating', 'immersed', 'merged'],
  },

  clarity: {
    dimension: 'FOCUS',

    metaphors: [
      'sharp/blurred',
      'clear/hazy',
      'foreground/background',
      'distinct/vague',
    ],

    verbs: {
      increase: ['focus', 'sharpen', 'clarify', 'highlight', 'attend'],
      decrease: ['blur', 'soften', 'fade', 'diffuse', 'peripheralize'],
    },

    adjectives: {
      low: ['hazy', 'diffuse', 'ambient', 'peripheral', 'vague'],
      medium: ['visible', 'noticed', 'apparent', 'evident'],
      high: ['sharp', 'crisp', 'vivid', 'scrutinized', 'focused'],
    },

    scale: ['ambient', 'peripheral', 'noticed', 'attended', 'scrutinized'],
  },
}
```

### Natural Language Interface (Future) `@spw:todo`

```typescript
/**
 * Example queries multimodal AI can understand/generate:
 *
 * User → AI (understanding):
 * "Show me what's active right now"
 *   → { intensity: { min: 0.7, max: 1.0 } }
 *
 * "Switch to a calmer, more observing mode"
 *   → { intensity: 0.3, proximity: 0.5, clarity: 0.8 }
 *
 * "I want to focus on details without touching anything"
 *   → { intensity: 0.2, proximity: 0.3, clarity: 1.0 }
 *
 * AI → User (generation):
 * features = { intensity: 0.9, proximity: 1.0, clarity: 0.7 }
 *   → "You're in an energetic, hands-on mode with moderate focus"
 *
 * features = { intensity: 0.2, proximity: 0.4, clarity: 0.9 }
 *   → "You're in a calm, observing stance with sharp attention"
 */
```

---

## Reduction & Expansion: Levels of Detail

### LOD System `@spw:term`

Support progressive disclosure and multimodal compression via **Levels of Detail**:

```
LOD 0: Minimal     → Single composite value (activation)
LOD 1: Categorical → Modal context label ("visual", "editing")
LOD 2: Coarse      → 3 core dimensions (intensity, proximity, clarity)
LOD 3: Fine        → 9 expanded dimensions with sub-features
LOD 4: Full        → All CSS properties + rendering details
```

### LOD 0: Minimal (Activation) `@spw:boundary`

**Use case**: Compressed state for logging, analytics, simple UI indicators

```typescript
function toActivation(features: SemanticFeatures): number {
  // Composite value averaging all dimensions
  return (features.intensity + features.proximity + features.clarity) / 3
}

// Example:
// visual:    (0.3 + 0.6 + 0.8) / 3 = 0.57
// editing:   (0.9 + 1.0 + 0.7) / 3 = 0.87
// structural: (0.5 + 0.4 + 0.9) / 3 = 0.60
```

**Visual encoding**: Single progress bar, opacity value, or badge color.

### LOD 1: Categorical (Label) `@spw:boundary`

**Use case**: User-facing labels, tab titles, breadcrumbs

```typescript
function toLabel(features: SemanticFeatures): string {
  // Classify based on feature profile
  if (features.intensity > 0.7 && features.proximity > 0.8) {
    return 'editing'
  }
  if (features.clarity > 0.7 && features.proximity < 0.5) {
    return 'visual'
  }
  return 'structural'
}
```

**Visual encoding**: Text label ("Visual Mode", "Editing Mode").

### LOD 2: Coarse (Core Features) `@spw:boundary`

**Use case**: Current system, theme computation, salience calculation

```typescript
function toFeatures(context: ModalContext): SemanticFeatures {
  return MODAL_PROFILES[context]
}

// Example:
// 'editing-semantic' → { intensity: 0.9, proximity: 1.0, clarity: 0.7 }
```

**Visual encoding**: CSS custom properties, theme transforms.

### LOD 3: Fine (Expanded Features) `@spw:boundary`

**Use case**: Advanced users, AI reasoning, detailed analytics

```typescript
interface ExpandedFeatures {
  // Intensity → Force dynamics (3 sub-features)
  force: {
    magnitude: number     // Overall force strength
    direction: 'outward' | 'inward' | 'neutral'  // Vector orientation
    persistence: number   // Sustained vs momentary
  }

  // Proximity → Spatial relation (3 sub-features)
  spatial: {
    distance: number      // Physical/conceptual distance
    orientation: 'toward' | 'away' | 'parallel'  // Directional relation
    containment: 'inside' | 'outside' | 'boundary'  // Topological relation
  }

  // Clarity → Attention allocation (3 sub-features)
  attention: {
    focus: number         // Sharpness of attentional spotlight
    scope: number         // Width of attention (inverse of focus)
    depth: number         // Depth of processing
  }
}

function toExpandedFeatures(features: SemanticFeatures): ExpandedFeatures {
  return {
    force: {
      magnitude: features.intensity,
      direction: features.intensity > 0.5 ? 'outward' : 'inward',
      persistence: features.intensity * 0.8,
    },
    spatial: {
      distance: 1.0 - features.proximity,
      orientation: features.proximity > 0.7 ? 'toward' : 'away',
      containment: features.proximity > 0.8 ? 'inside' : 'outside',
    },
    attention: {
      focus: features.clarity,
      scope: 1.0 - features.clarity,
      depth: features.clarity * features.proximity,
    },
  }
}
```

**Visual encoding**: Detailed inspector panel, debug overlay, analytics dashboard.

### LOD 4: Full (CSS Properties) `@spw:boundary`

**Use case**: Rendering, theme application, visual presentation

```typescript
interface CSSProperties {
  // Color
  hue: number
  saturation: number
  lightness: number
  opacity: number

  // Spatial
  borderWeight: string
  glowIntensity: number
  shadowDepth: string
  zIndex: number

  // Motion
  transitionDuration: string
  transitionEasing: string

  // Accessibility
  patternFill?: string
  motionReduced?: boolean
}

function toCSS(
  features: SemanticFeatures,
  theme: Theme,
  baseColor: Color
): CSSProperties {
  // Full rendering logic (see Theme Engine section)
}
```

---

## Multimodal AI Handles

### Embedding Space Compatibility `@spw:term`

Semantic features map directly to **embedding vectors** used by multimodal models.

```typescript
/**
 * Convert features to vector for AI models
 *
 * This allows:
 * 1. AI to understand current UI state from features
 * 2. AI to generate UI states from natural language
 * 3. Interpolation between states (smooth transitions)
 * 4. Extrapolation to novel states (generalization)
 */

function toVector(features: SemanticFeatures): Float32Array {
  return new Float32Array([
    features.intensity,
    features.proximity,
    features.clarity,
  ])
}

function fromVector(vector: Float32Array): SemanticFeatures {
  return {
    intensity: clamp(vector[0], 0, 1),
    proximity: clamp(vector[1], 0, 1),
    clarity: clamp(vector[2], 0, 1),
  }
}
```

### Interpolation & Extrapolation `@spw:term`

```typescript
/**
 * Interpolate between two states
 *
 * Use case: Smooth animated transitions
 * Example: Visual mode (0.3, 0.6, 0.8) → Editing mode (0.9, 1.0, 0.7)
 *   at t=0.5 → (0.6, 0.8, 0.75)
 */

function interpolate(
  from: SemanticFeatures,
  to: SemanticFeatures,
  t: number  // 0.0 - 1.0
): SemanticFeatures {
  return {
    intensity: lerp(from.intensity, to.intensity, t),
    proximity: lerp(from.proximity, to.proximity, t),
    clarity: lerp(from.clarity, to.clarity, t),
  }
}

/**
 * Extrapolate beyond known states
 *
 * Use case: AI generates novel mode from user description
 * Example: "Even more intense than editing mode"
 *   editing = (0.9, 1.0, 0.7)
 *   extrapolate(editing, direction=(+0.3, 0, +0.2))
 *   → (1.0, 1.0, 0.9) [clamped to valid range]
 */

function extrapolate(
  base: SemanticFeatures,
  delta: SemanticFeatures
): SemanticFeatures {
  return {
    intensity: clamp(base.intensity + delta.intensity, 0, 1),
    proximity: clamp(base.proximity + delta.proximity, 0, 1),
    clarity: clamp(base.clarity + delta.clarity, 0, 1),
  }
}
```

### Semantic Distance & Similarity `@spw:term`

```typescript
/**
 * Compute semantic distance between states
 *
 * Use case: Find similar UI states, cluster user behaviors
 * Example:
 *   visual = (0.3, 0.6, 0.8)
 *   editing = (0.9, 1.0, 0.7)
 *   distance(visual, editing) = sqrt((0.6)² + (0.4)² + (0.1)²) ≈ 0.73
 */

function distance(a: SemanticFeatures, b: SemanticFeatures): number {
  return Math.sqrt(
    Math.pow(a.intensity - b.intensity, 2) +
    Math.pow(a.proximity - b.proximity, 2) +
    Math.pow(a.clarity - b.clarity, 2)
  )
}

/**
 * Find nearest modal context to given features
 *
 * Use case: AI-generated state → classify to known mode
 */

function nearestContext(features: SemanticFeatures): ModalContext {
  let minDist = Infinity
  let nearest: ModalContext = 'structural'

  for (const [context, profile] of Object.entries(MODAL_PROFILES)) {
    const dist = distance(features, profile)
    if (dist < minDist) {
      minDist = dist
      nearest = context as ModalContext
    }
  }

  return nearest
}
```

### Vision-Language Grounding `@spw:term`

```typescript
/**
 * Generate natural language description from features
 *
 * Use case: AI explains current state to user
 */

function describe(features: SemanticFeatures): string {
  const intensity = LINGUISTIC_ANCHORS.intensity.scale[
    Math.floor(features.intensity * 4)
  ]
  const proximity = LINGUISTIC_ANCHORS.proximity.scale[
    Math.floor(features.proximity * 4)
  ]
  const clarity = LINGUISTIC_ANCHORS.clarity.scale[
    Math.floor(features.clarity * 4)
  ]

  return `${intensity}, ${proximity}, ${clarity}`
  // Example: "driving, immersed, attended"
  //       or "stirring, observing, scrutinized"
}

/**
 * Parse natural language to features
 *
 * Use case: User requests state change via voice/text
 *
 * Implementation: LLM maps description to feature vector
 * Example prompts:
 *   "I want a calm, observing mode with sharp focus"
 *     → { intensity: 0.2, proximity: 0.5, clarity: 0.9 }
 *
 *   "Make it more energetic and hands-on"
 *     → current + { intensity: +0.3, proximity: +0.2, clarity: 0 }
 */

async function parse(description: string): Promise<SemanticFeatures> {
  // Call LLM API with few-shot examples
  // Return feature vector
  // See implementation in src/design/semantics/grounding.ts
}
```

---

## Theme Engine: Features → Visual Properties

### Theme Transform Interface `@spw:term`

```typescript
/**
 * Themes are pure functions: SemanticFeatures → VisualTransform
 *
 * This separates semantic state from visual presentation.
 */

interface VisualTransform {
  // Color adjustments (relative to base)
  hueShift?: number           // -180 to +180 degrees
  saturationScale?: number    // 0.0 to 2.0 multiplier
  lightnessShift?: number     // -50 to +50 percentage points

  // Spatial adjustments
  borderWeightScale?: number  // 0.5 to 2.0 multiplier
  glowIntensityScale?: number // 0.0 to 2.0 multiplier
  shadowDepthScale?: number   // 0.5 to 2.0 multiplier

  // Accessibility
  patternFill?: 'solid' | 'dots' | 'stripes' | 'crosshatch'
  motionReduced?: boolean

  // Audio (future)
  volumeScale?: number        // 0.0 to 2.0 multiplier
  reverbMix?: number          // 0.0 to 1.0
  pitchShift?: number         // -12 to +12 semitones
}

interface Theme {
  name: string
  description: string

  // Feature-to-visual mapping (one per modal context)
  transforms: {
    visual: VisualTransform
    editing: VisualTransform
    structural: VisualTransform
  }

  // Optional activation profile override
  activation?: {
    visual: number
    editing: number
    structural: number
  }
}
```

### Built-in Themes

#### Theme 1: Intensity (refactored "temperature")

```typescript
const INTENSITY_THEME: Theme = {
  name: 'Intensity',
  description: 'Visual encoding based on force dynamics (active/passive)',

  transforms: {
    // Low intensity → cooler hues (blue-cyan range)
    visual: {
      hueShift: +20,           // Shift toward blue
      saturationScale: 0.9,    // Slightly desaturated
      lightnessShift: +5,      // Slightly lighter
    },

    // High intensity → warmer hues (amber-orange range)
    editing: {
      hueShift: -20,           // Shift toward red-orange
      saturationScale: 1.2,    // More saturated
      lightnessShift: -5,      // Slightly darker
    },

    // Medium intensity → neutral
    structural: {
      hueShift: 0,
      saturationScale: 1.0,
      lightnessShift: 0,
    },
  },
}
```

#### Theme 2: Saturation

```typescript
const SATURATION_THEME: Theme = {
  name: 'Saturation',
  description: 'Visual encoding based on engagement level (vivid/muted)',

  transforms: {
    // Low proximity → muted, washed out
    visual: {
      saturationScale: 0.5,    // Very desaturated
      lightnessShift: +10,     // Lighter
    },

    // High proximity → vivid, saturated
    editing: {
      saturationScale: 1.5,    // Highly saturated
      lightnessShift: -5,      // Slightly darker for contrast
    },

    structural: {
      saturationScale: 0.9,
      lightnessShift: 0,
    },
  },
}
```

#### Theme 3: Contrast

```typescript
const CONTRAST_THEME: Theme = {
  name: 'Contrast',
  description: 'Visual encoding based on attentional focus (bright/dim)',

  transforms: {
    // High clarity → brighter
    visual: {
      lightnessShift: +15,     // Lighter for sharp focus
      saturationScale: 0.8,
    },

    // Medium clarity → darker
    editing: {
      lightnessShift: -10,     // Darker for action state
      saturationScale: 1.0,
    },

    structural: {
      lightnessShift: 0,
      saturationScale: 0.9,
    },
  },
}
```

#### Theme 4: Patterns (Accessibility)

```typescript
const PATTERN_THEME: Theme = {
  name: 'Patterns',
  description: 'Pattern-based encoding for color-blind users',

  transforms: {
    visual: {
      patternFill: 'dots',     // Dotted for observation
      saturationScale: 0.7,
      motionReduced: true,
    },

    editing: {
      patternFill: 'stripes',  // Striped for action
      saturationScale: 1.0,
      motionReduced: false,
    },

    structural: {
      patternFill: 'solid',
      saturationScale: 0.9,
      motionReduced: true,
    },
  },
}
```

### Theme Application `@spw:boundary`

```typescript
/**
 * Apply theme to semantic features
 *
 * Pipeline:
 * 1. Get semantic features for modal context
 * 2. Get theme transform for modal context
 * 3. Apply transform to base color
 * 4. Compute salience from layer depth
 * 5. Generate CSS custom properties
 */

function applyTheme(
  context: ModalContext,
  layerDepth: number,
  baseColor: Color,
  theme: Theme = ACTIVE_THEME
): CSSProperties {
  // 1. Get semantic features
  const features = MODAL_PROFILES[context]

  // 2. Get theme transform
  const transform = theme.transforms[context]

  // 3. Apply color transforms
  const hue = (baseColor.hue + (transform.hueShift ?? 0)) % 360
  const sat = baseColor.saturation * (transform.saturationScale ?? 1.0)
  const light = clamp(baseColor.lightness + (transform.lightnessShift ?? 0), 0, 100)

  // 4. Compute salience from layer depth
  const salience = Math.exp(-0.4 * layerDepth)

  // 5. Compute activation-based properties
  const activation = theme.activation?.[context] ?? features.intensity

  // 6. Generate CSS
  return {
    hue,
    saturation: sat * salience,
    lightness: light,
    opacity: salience,

    borderWeight: `${(1 + 2 * activation) * (transform.borderWeightScale ?? 1.0)}px`,
    glowIntensity: activation * 0.6 * (transform.glowIntensityScale ?? 1.0),
    shadowDepth: `${20 * features.proximity * (transform.shadowDepthScale ?? 1.0)}px`,

    transitionDuration: transform.motionReduced ? '0ms' : '400ms',
    transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',

    patternFill: transform.patternFill,
  }
}
```

---

## Future: CSS Voice & Ambient Scenery

### CSS Voice Integration `@spw:todo`

Map semantic dimensions to audio properties (when CSS Voice spec lands):

```css
.keybinding-geology {
  /* Visual properties */
  --intensity: 0.9;
  --proximity: 1.0;
  --clarity: 0.7;

  /* Audio properties (future spec) */
  voice-volume: calc(50% + 50% * var(--intensity));
  voice-reverb: calc(100% - 100% * var(--proximity));
  voice-pitch: calc(100Hz + 200Hz * var(--clarity));
  voice-rate: calc(0.8 + 0.4 * var(--intensity));

  /* Ambient soundscape */
  ambient-scene: "workshop";  /* vs "library", "plaza" */
  ambient-mix: calc(50% * var(--intensity));
}
```

### Genre Media Scenery `@spw:todo`

Map semantic features to immersive ambient scenes:

```typescript
const AMBIENT_SCENES = {
  'lo-fi-study': {
    // Feature profile for scene activation
    featureProfile: {
      intensity: 0.3,   // Calm
      proximity: 0.8,   // Engaged
      clarity: 0.6      // Soft focus
    },

    // Audio characteristics
    audio: {
      genre: 'lo-fi-hip-hop',
      bpm: 70,
      reverb: 0.3,
      volume: 0.4,
    },

    // Visual effects
    visual: {
      particles: 'rain',
      blur: 0.2,
      vignette: 0.4,
      grain: 0.1,
    },

    // Color palette
    palette: 'warm-muted',
  },

  'cyberpunk-flow': {
    featureProfile: {
      intensity: 0.9,   // High energy
      proximity: 1.0,   // Immersed
      clarity: 0.8      // Sharp
    },

    audio: {
      genre: 'synthwave',
      bpm: 120,
      reverb: 0.6,
      volume: 0.7,
    },

    visual: {
      particles: 'neon-grid',
      blur: 0.0,
      vignette: 0.2,
      scanlines: 0.15,
    },

    palette: 'neon-cool',
  },

  'forest-retreat': {
    featureProfile: {
      intensity: 0.2,   // Very calm
      proximity: 0.3,   // Distant
      clarity: 0.9      // Crystalline
    },

    audio: {
      genre: 'nature',
      bpm: 0,
      reverb: 0.8,
      volume: 0.3,
    },

    visual: {
      particles: 'leaves',
      blur: 0.1,
      vignette: 0.5,
      grain: 0.05,
    },

    palette: 'earth-tones',
  },
}

/**
 * Activate scene based on semantic distance
 */
function activateScene(features: SemanticFeatures): AmbientScene | null {
  let minDistance = Infinity
  let nearestScene: AmbientScene | null = null

  for (const [name, scene] of Object.entries(AMBIENT_SCENES)) {
    const dist = distance(features, scene.featureProfile)
    if (dist < minDistance) {
      minDistance = dist
      nearestScene = scene
    }
  }

  // Only activate if within threshold
  return minDistance < 0.3 ? nearestScene : null
}
```

---

## Migration Path `@spw:boundary`

### Phase 1: Create Semantic Infrastructure

**Files to create**:
- `src/design/semantics/features.ts` - Core types, MODAL_PROFILES
- `src/design/semantics/anchors.ts` - LINGUISTIC_ANCHORS, metaphor mappings
- `src/design/semantics/lod.ts` - SemanticLOD, FeatureDisclosure
- `src/design/semantics/embedding.ts` - toVector, interpolate, distance
- `src/design/semantics/grounding.ts` - describe, parse (vision-language)
- `src/design/semantics/index.ts` - Barrel exports

**No breaking changes** - this is additive infrastructure.

### Phase 2: Refactor Design Tokens

**Files to modify**:
- `src/design/tokens.ts` - Add semantic feature references
- `src/design/themes/theme-engine.ts` - NEW: applyTheme function
- `src/design/themes/intensity.ts` - NEW: refactored temperature theme

**Breaking changes**: None (backward compatible via default theme)

### Phase 3: Update Geology Component

**Files to modify**:
- `src/features/keyboard/components/keybinding-geology.ts`
  - Subscribe to semantic features instead of hardcoded context
  - Apply theme via theme engine
- `src/features/keyboard/components/keybinding-geology.css`
  - Replace `--modal-context-hue` with `--intensity`, `--proximity`, `--clarity`
  - Use feature-based CSS custom properties

**Breaking changes**: CSS custom property names change

### Phase 4: Flow Inspector with Semantic Features

**Files to create/modify**:
- `src/viz/flow/flow.css` - NEW: Apply semantic features to flow nodes
- `src/viz/flow/renderer.ts` - Use theme engine for node styling
- `src/app/components/breadcrumbs.ts` - NEW: Show feature-based navigation

### Phase 5: Multimodal AI Integration `@spw:todo`

**Future work**:
- LLM integration for natural language → features
- Voice interface using CSS voice properties
- Ambient scene activation based on feature space
- Analytics/telemetry using embedding vectors

---

## Implementation Checklist `@spw:todo`

### Phase 1: Semantic Infrastructure
- [ ] Create `src/design/semantics/` directory
- [ ] Define `SemanticFeatures` interface
- [ ] Define `MODAL_PROFILES` constants
- [ ] Define `LINGUISTIC_ANCHORS` constants
- [ ] Implement `SemanticLOD` class (reduction/expansion)
- [ ] Implement `SemanticEmbedding` class (multimodal AI)
- [ ] Implement `VisionLanguageGrounding` class (future)
- [ ] Write unit tests for feature transformations
- [ ] Document with `@spw:term` markers

### Phase 2: Theme Engine
- [ ] Create `Theme` interface
- [ ] Create `VisualTransform` interface
- [ ] Implement `applyTheme()` function
- [ ] Create 4 built-in themes (Intensity, Saturation, Contrast, Patterns)
- [ ] Create `ThemeRegistry` class
- [ ] Add theme selection UI (settings panel)
- [ ] Document theme authoring guide
- [ ] Write unit tests for theme application

### Phase 3: Geology Refactor
- [ ] Update geology TypeScript to use semantic features
- [ ] Update geology CSS to consume feature variables
- [ ] Add smooth transitions (400ms) between feature states
- [ ] Add accessibility theme (patterns, high contrast)
- [ ] Test with keyboard navigation and screen readers
- [ ] Update VIM-KEYBINDINGS.md documentation

### Phase 4: Flow Inspector
- [ ] Apply semantic features to flow nodes
- [ ] Implement cross-highlighting with geology
- [ ] Add breadcrumb navigation component
- [ ] Add projection indicators (lifecycle states)
- [ ] Create demo script and reset path
- [ ] Document with `@spw:episode` markers

### Phase 5: Future Enhancements
- [ ] LLM integration for natural language parsing
- [ ] Voice interface (when CSS voice lands)
- [ ] Ambient scene system
- [ ] Analytics using embedding space
- [ ] A/B testing framework for themes

---

## References

### Cognitive Science
- Lakoff, G. & Johnson, M. (1980). *Metaphors We Live By*. University of Chicago Press.
- Lakoff, G. (1987). *Women, Fire, and Dangerous Things*. University of Chicago Press.
- Gärdenfors, P. (2000). *Conceptual Spaces: The Geometry of Thought*. MIT Press.
- Frijda, N. H. (1986). *The Emotions*. Cambridge University Press.

### Multimodal AI
- Radford, A. et al. (2021). "Learning Transferable Visual Models From Natural Language Supervision" (CLIP)
- Alayrac, J. et al. (2022). "Flamingo: a Visual Language Model for Few-Shot Learning"

### Related Documents
- `docs/design/research-episodes-plan.md` - Episode contract and development ethos
- `docs/audits/ontological-geometry-audit.md` - CSS as differential topology
- `src/features/keyboard/VIM-KEYBINDINGS.md` - Geology layer semantics
- `docs/design/phase-3-flow-inspector-plan.md` - Flow unification plan

---

**Status**: Design specification complete, ready for implementation
**Next**: Begin Phase 1 - Create semantic infrastructure
**Success Criteria**:
- ✓ Cognitively grounded (embodied cognition)
- ✓ Culturally neutral (no hardcoded metaphors)
- ✓ AI-compatible (embedding space, interpolation)
- ✓ Accessible (pattern theme, high contrast)
- ✓ Extensible (LOD system, theme plugins)
- ✓ Future-proof (voice, ambient media hooks)
