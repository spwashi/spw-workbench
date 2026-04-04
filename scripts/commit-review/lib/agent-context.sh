#!/usr/bin/env bash

spw_detect_agent() {
  if [ -n "${SPW_AGENT:-}" ]; then
    printf '%s\n' "$SPW_AGENT"
  elif [ -n "${CLAUDE_SESSION_ID:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    printf '%s\n' "claude"
  elif [ -n "${GEMINI_SESSION_ID:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ]; then
    printf '%s\n' "gemini"
  elif [ -n "${GITHUB_COPILOT:-}" ]; then
    printf '%s\n' "copilot"
  elif [ -n "${ANTIGRAVITY_SESSION:-}" ]; then
    printf '%s\n' "antigravity"
  else
    printf '%s\n' "human"
  fi
}
