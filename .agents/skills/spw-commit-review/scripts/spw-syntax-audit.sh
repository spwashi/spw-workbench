#!/usr/bin/env bash
# spw-syntax-audit.sh — Context loader: .spw syntax review landscape
#
# Primes an agent with:
#   - Which .spw files exist and where (grouped by stratum)
#   - Which syntax review profile each file falls under
#   - Which files would trigger review if discouraged forms were introduced
#   - Entry points for each stratum (index.spw)
#
# Delegates fully to the TS implementation.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node --import tsx "${DIR}/spw-syntax-audit.ts" "$@"
