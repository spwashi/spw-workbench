#!/usr/bin/env bash
set -euo pipefail

spw_authorize_commit() {
  local repo_root="$1"
  local prompt="${2:-Authorize git commit}"
  local touchid_helper="$repo_root/scripts/touchid-authorize.swift"

  if [ -f "$touchid_helper" ]; then
    echo "  🔐 Touch ID authorization required..."
    swift "$touchid_helper" "$prompt"
    local auth_result=$?

    if [ "$auth_result" -eq 0 ]; then
      echo "  ✓ Authorized via Touch ID."
      echo ""
      return 0
    elif [ "$auth_result" -eq 2 ]; then
      echo "  ⚠  Touch ID unavailable, falling back to interactive prompt."
    else
      echo ""
      echo "  ✗ Commit denied."
      echo ""
      return 1
    fi
  fi

  if [ ! -t 0 ]; then
    echo "  ⛔ Non-interactive terminal and Touch ID unavailable."
    echo "     Cannot authorize this commit."
    echo ""
    echo "     Options:"
    echo "       git commit --no-verify                # Skip all hooks"
    echo ""
    return 1
  fi

  echo "  Authorize this commit? [y/N] "
  read -r REPLY < /dev/tty
  case "$REPLY" in
    y|Y|yes|YES)
      echo ""
      echo "  ✓ Authorized."
      echo ""
      return 0
      ;;
    *)
      echo ""
      echo "  ✗ Commit aborted by user."
      echo ""
      return 1
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  spw_authorize_commit "${1:-}" "${2:-}"
fi
