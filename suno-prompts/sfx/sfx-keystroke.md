# SFX: Keystroke

## Generation Notes
- **Method**: Web Audio API Synthesis
- **Duration**: 50ms
- **Format**: Programmatic (Web Audio API)

## Synthesis Parameters
White noise burst through BandpassFilter(3500Hz, Q=1.5). ADSR envelope: 3ms attack, 7ms decay to 60%, 40ms release to zero.

## Sound Design
A soft, mechanical key press — like a Cherry MX Blue switch but attenuated. Short attack, almost no sustain, quick decay. Subtle and non-fatiguing for repeated playback.

## Metadata
- **Trigger**: Editor typing (debounced 150ms)
- **Category**: sfx
- **Stage minimum**: 2
