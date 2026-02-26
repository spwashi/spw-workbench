#!/usr/bin/env bash
# spw-syntax-audit.sh — Context loader: .spw file landscape
#
# Primes an agent with:
#   - Which .spw files exist and where (grouped by stratum)
#   - Which syntax generation each file uses
#   - Which files are candidates for Gen 2→3 migration
#   - Entry points for each stratum (index.spw)
#
# Delegates fully to the TS implementation.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node --import tsx "${DIR}/spw-syntax-audit.ts" "$@"
