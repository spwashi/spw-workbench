#!/usr/bin/env bash
set -euo pipefail

spw_validate_commit_message() {
  local msg_file="${1:-}"
  local msg subject

  if [[ -z "$msg_file" ]] || [[ ! -f "$msg_file" ]]; then
    echo "commit-msg: missing commit message file path" >&2
    return 2
  fi

  msg="$(cat "$msg_file")"
  subject="$(printf '%s\n' "$msg" | head -n 1)"

  if [[ "$subject" == Merge\ * ]]; then
    return 0
  fi

  if printf '%s\n' "$msg" | grep -qE '(^|[^a-zA-Z])(/Users/|file:///Users/|[A-Za-z]:\\\\Users\\\\)'; then
    echo "commit-msg: found absolute user path reference; use repo-relative paths" >&2
    return 1
  fi

  if [[ "${SPW_EPISODE_SKIP:-0}" == "1" ]]; then
    return 0
  fi

  if ! printf '%s\n' "$msg" | grep -qE '^#\[episode\]\{' ; then
    cat >&2 <<'EOF'
commit-msg: missing required Spw episode block.

Add a body like:

#[episode]{
  ~[scene]{ "..." }
  ![change]{ intent: "..." invariant: "..." }
  *[verify]{ local: ["..."] }
}

If you're rewriting older history and need to temporarily skip this requirement:

  SPW_EPISODE_SKIP=1 git commit ...
EOF
    return 1
  fi

  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  spw_validate_commit_message "${1:-}"
fi
