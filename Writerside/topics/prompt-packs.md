# Prompt Packs

This repo is designed to be used as a promptable system for other media.

A prompt pack is a small, versioned set of prompts that:
- points at specific canon surfaces (claims, exhibits, specs)
- names the desired output medium (text, image, audio, video, performance)
- includes constraints (tone, structure, references)

## What to reference

- Use exhibits as anchors: a prompt pack should point to a perceivable artifact.
- Use claims as constraints: "keep invariant X" is better than vague style.
- Use the spec library for vocabulary and operator semantics.

## Where prompt packs live

Recommended:
- `docs/suno-prompts/` for audio-oriented packs
- `docs/prompts/` for general packs

## Minimal structure

- Intent
- Inputs (paths)
- Constraints (claims)
- Output format
- Evaluation rubric
