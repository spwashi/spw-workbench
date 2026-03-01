# SFX: Mode Switch

## Generation Notes
- **Method**: Web Audio API Synthesis
- **Duration**: 80ms
- **Format**: Programmatic (Web Audio API)

## Synthesis Parameters
White noise burst through HighpassFilter(2500Hz, Q=3) at 30% volume. Sine ping at 1200Hz at 40% volume. Both with 5ms/3ms attack, full release over 80ms.

## Sound Design
A crisp, short click with a subtle tonal quality — like engaging a high-quality toggle switch. Different from keystroke: more intentional, more metallic. Clean attack, zero sustain.

## Metadata
- **Trigger**: Mode change (normal/insert/command)
- **Category**: sfx
- **Stage minimum**: 2
