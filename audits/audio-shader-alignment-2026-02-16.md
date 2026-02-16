# Audio-Shader Alignment Analysis

## Executive Summary

The audio synthesis refactor has created **structural symmetry** with the shader system. Both now follow the same pattern:
1. **Personality → Characteristics** (pure mapping)
2. **Per-theme profiles** (static overrides)
3. **Feature channels** (lifecycle hooks)
4. **Interaction effects** (event-driven modulation)

This alignment creates an opportunity to **unify attunement** across sensory modalities.

---

## Structural Parallels

| Concept | Audio | Shaders | Alignment Opportunity |
|---------|-------|---------|----------------------|
| **Characteristics** | `AudioCharacteristics` (7 dims) | `ShaderCharacteristics` (4 dims) | Shared personality mapping |
| **Per-Theme Profiles** | `SynthProfileOverrides` | `ThemeShaderProfile` | Unified profile registry |
| **Personality Bridge** | `computeAudioCharacteristics()` | `deriveCharacteristicsFromPersonality()` | Shared derivation logic |
| **Feature Channels** | `registerChannel({ id: 'audio' })` | (not yet implemented) | Shader channel for context transitions |
| **Interaction Effects** | SFX on UI events | `triggerReaction()` on pointer/key | Coordinated audio-visual reactions |
| **Layering** | Ambient + SFX + Ballads | Shader programs + overlays | Multi-channel composition |

---

## Detailed Comparison

### 1. **Personality → Characteristics Mapping**

#### Audio (`audio-bridge.ts`)
```typescript
export function computeAudioCharacteristics(personality: ThemePersonality): AudioCharacteristics {
  return {
    frequencyBias: personality.warmth,
    rhythmicComplexity: personality.rhythm,
    textureGrain: personality.grain,
    dynamicRange: personality.luminanceCycle,
    layerDensity: personality.particleDensity,
    tempoFeel: personality.motionCharacter,
    spatialDepth: personality.depth,
  }
}
```

#### Shaders (`shaders/defaults.ts`)
```typescript
export function deriveCharacteristicsFromPersonality(
  personality: ThemePersonality,
  family: ShaderCharacteristics['family'],
): Omit<ShaderCharacteristics, 'family'> {
  const cal = FAMILY_CALIBRATION[family] ?? FAMILY_CALIBRATION.digital
  return {
    bloom: clamp01(personality.luminanceCycle * 0.6 + personality.depth * 0.4 + cal.bloom),
    noise: clamp01(personality.grain * 0.7 + (1 - personality.warmth) * 0.2 + cal.noise),
    speed: clamp01(personality.rhythm * 0.7 + personality.motionCharacter * 0.3 + cal.speed),
    complexity: clamp01(personality.depth * 0.6 + personality.particleDensity * 0.4 + cal.complexity),
  }
}
```

**Alignment**: Both are pure functions of `ThemePersonality`. Both use weighted combinations of personality dimensions.

---

### 2. **Per-Theme Profiles**

#### Audio (`synth-profiles.ts`)
```typescript
const hudOverrides: SynthProfileOverrides = {
  envelopeScale: { attack: 0.7, decay: 0.8, release: 0.8 },
  filterBias: { frequency: 500, Q: 0.5 },
  frequencyShift: 0,
  noiseColor: 'white',
  effectWetness: 0.3,
  volumeScale: 1.0,
}
```

#### Shaders (`shaders/defaults.ts`)
```typescript
hud: {
  id: 'hud',
  name: 'Tactical HUD',
  characteristics: { bloom: 0.8, noise: 0.2, speed: 0.5, complexity: 0.6, family: 'digital' },
  programId: 'digital',
  intensityWeight: 1.0,
  alphaWeight: 0.34,
}
```

**Alignment**: Both define per-theme **calibration biases** that preserve aesthetic fingerprints when deriving from personality.

---

### 3. **Color Palette Attunement**

#### Component Subpalettes (`component-subpalettes.ts`)
- **Motif System**: Each component (toast, inspector, editor) has a `ComponentMotif` with `accent`, `secondary`, `tint`, `glow`, `border`.
- **Context-Aware**: Motifs adapt per `ActivationContext` (visual/editing/reporting/debug/etc.).
- **Theme-Aware**: Motifs vary per theme (dark/light/hud-spectrum).

**Audio Parallel**: The **ambient engine** already uses `AudioCharacteristics` to tune drone frequencies, shimmer partials, and noise texture. This is analogous to how motifs tune visual elements.

**Opportunity**: Create an **`AudioMotif`** system where SFX and ambient layers adapt per `ActivationContext`:
- **Visual context** → brighter tones, shorter envelopes
- **Debug context** → harsher noise, dissonant intervals
- **Pedagogical context** → gentler envelopes, consonant harmonies

---

### 4. **Feature Channels & Context Lifecycle**

#### Current Audio Channel (`interaction-sounds.ts`)
```typescript
const unregisterChannel = registerChannel({
  id: 'audio',
  onContextEnter: () => {
    triggerModeSwitchSfx()
  },
})
```

#### Shader Channel (not yet implemented)
Shaders currently react to DOM events (`spw-context-change`) but don't use the `registerChannel` API.

**Opportunity**: Register a shader channel:
```typescript
registerChannel({
  id: 'shaders',
  onContextEnter: (transition) => {
    // Trigger shader reaction based on transition.to context
    const profile = resolveProfileForTheme(transition.themeId)
    shaderRenderer.triggerReaction(profile.intensityWeight, { kind: 4 })
  },
})
```

---

### 5. **Interaction Effects Coordination**

#### Shaders (`interaction-effects.ts`)
- **Event Presets**: `pointer`, `action`, `escape`, `typing`, `contextShift`
- **Semantic Scales**: Intent (diagnostic/analysis/presentation) + Trajectory (surge/steady/sweep)
- **Runtime Scales**: Posture (paused/replay/explain) + Cadence (glance/browse/deep_work)

#### Audio (current)
- **Event-Driven SFX**: `triggerSfx()` on DOM events
- **No Semantic/Runtime Scaling**: SFX are theme-aware but not context-aware

**Opportunity**: Apply the same **semantic + runtime scaling** to audio:
```typescript
function resolveAudioScales(root: HTMLElement): { volume: number; envelope: number } {
  const intent = root.dataset.shadersResolvedIntent ?? 'authoring'
  const cadence = root.dataset.uiCadence ?? 'work'
  
  // Diagnostic → louder, sharper SFX
  // Deep work → quieter, gentler SFX
  return {
    volume: intentScale.volume * cadenceScale.volume,
    envelope: intentScale.envelope * cadenceScale.envelope,
  }
}
```

---

### 6. **Layering & Channels**

#### Audio
- **Ambient**: Generative drone engine (5 layers: base drone, shimmer, LFO, noise, reverb)
- **SFX**: Transient synthesis (13 patches)
- **Ballads**: (planned, not yet implemented)

#### Shaders
- **Background Programs**: `digital`, `nebula`, `analog`, `void`, `grain`, `glass`, `smoke`
- **Interaction Overlays**: Reaction ripples triggered by user input

**Alignment**: Both use **multi-channel composition** where layers blend to create the final output.

---

## Proposed Unified Attunement Framework

### 1. **Shared Personality Bridge**
Create a single `AttunementBridge` that derives both audio and shader characteristics from personality:

```typescript
// src/design/themes/attunement-bridge.ts
export interface AttunementCharacteristics {
  audio: AudioCharacteristics
  shaders: ShaderCharacteristics
  motif: ComponentMotif  // NEW: audio-visual color coordination
}

export function deriveAttunement(
  personality: ThemePersonality,
  themeFamily: string,
): AttunementCharacteristics {
  return {
    audio: computeAudioCharacteristics(personality),
    shaders: deriveCharacteristicsFromPersonality(personality, themeFamily),
    motif: deriveMotifFromPersonality(personality),  // NEW
  }
}
```

### 2. **Audio Motif System**
Extend the motif concept to audio:

```typescript
export interface AudioMotif {
  /** Base frequency bias (Hz shift) */
  frequencyShift: number
  /** Envelope timing scale */
  envelopeScale: number
  /** Noise color preference */
  noiseColor: NoiseColor
  /** Effect wetness scale */
  effectWetness: number
}

// Derive from ComponentMotif colors
function deriveAudioMotifFromColors(motif: ComponentMotif): AudioMotif {
  // Extract hue/saturation from accent color
  const hue = extractHue(motif.accent)  // 0-360
  const saturation = extractSaturation(motif.accent)  // 0-1
  
  return {
    frequencyShift: (hue / 360 - 0.5) * 200,  // ±100 Hz based on hue
    envelopeScale: 0.7 + saturation * 0.6,    // 0.7-1.3 based on saturation
    noiseColor: saturation > 0.7 ? 'white' : saturation > 0.4 ? 'pink' : 'brown',
    effectWetness: extractLightness(motif.glow),  // 0-1 based on glow brightness
  }
}
```

### 3. **Unified Feature Channel**
Create a single `attunement` channel that coordinates audio + shaders:

```typescript
registerChannel({
  id: 'attunement',
  onContextEnter: (transition) => {
    const attunement = deriveAttunement(transition.personality, transition.themeFamily)
    
    // Update audio
    if (currentAmbientSynth) {
      currentAmbientSynth.updateCharacteristics(attunement.audio)
    }
    
    // Update shaders
    shaderRenderer.updateProfile(attunement.shaders)
    
    // Update component motifs
    applyAllSubpalettes()
  },
})
```

### 4. **Coordinated Interaction Effects**
Wire audio + shader reactions to the same events:

```typescript
function triggerCoordinatedReaction(kind: InteractionEventKind, point?: [number, number]) {
  // Shader reaction
  shaderRenderer.triggerReaction(amount, { center: point, radius, kind })
  
  // Audio reaction (NEW)
  const sfxId = REACTION_SFX_MAP[kind]  // e.g., 'pointer' → 'sfx-button-click'
  if (sfxId) triggerSfx(sfxId)
}
```

---

## Implementation Roadmap

1. **Phase 1: Audio Motif System** (3-4 files)
   - Create `audio-motif.ts` with `AudioMotif` type
   - Add `deriveAudioMotifFromColors()` helper
   - Update `triggerSfx()` to accept `AudioMotif` overrides

2. **Phase 2: Shader Feature Channel** (1-2 files)
   - Register shader channel in `features/shaders/index.ts`
   - Wire `onContextEnter` to `shaderRenderer.updateProfile()`

3. **Phase 3: Unified Attunement Bridge** (2-3 files)
   - Create `design/themes/attunement-bridge.ts`
   - Refactor `audio-bridge.ts` and `shader-bridge.ts` to use it

4. **Phase 4: Coordinated Reactions** (1-2 files)
   - Create `features/attunement/coordinated-reactions.ts`
   - Wire audio + shader reactions to shared event handlers

---

## Benefits

1. **Authoring Interface Integration**: Personality sliders can now preview **audio + visual + color** changes in real-time.
2. **Thematic Coherence**: Audio and visual aesthetics stay aligned as themes evolve.
3. **Reduced Duplication**: Shared personality mapping logic eliminates redundant code.
4. **Extensibility**: New sensory modalities (haptics, spatial audio) can plug into the same framework.
