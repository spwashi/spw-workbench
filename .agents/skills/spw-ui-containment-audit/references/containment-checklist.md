# UI Containment Checklist

Goal: restore a clear containment contract (who owns size and scroll) with minimal changes.

## Diagnose

- Identify the intended container (grid item, flex item, panel body).
- Determine whether children are in-flow or out-of-flow.
- Confirm which element should scroll (prefer one scroll owner per axis).

## Common Root Causes

- Out-of-flow children (`position: absolute/fixed`) not counted in parent sizing.
- Flex/grid children unable to shrink (missing `min-width: 0` / `min-height: 0`).
- Accidental overflow due to long lines (`white-space: nowrap` without `overflow` handling).
- Container queries / size containment preventing intrinsic sizing.
- Header/body split missing `min-height: 0` on the body.

## Fix Patterns

- Put `overflow: auto` on the intended scroll owner and ensure parents allow it (`min-height: 0`).
- Move spacing to containers (`padding`, `gap`) instead of child margins to avoid margin collapse.
- Make overlays “belong” to a positioned parent (`position: relative` on the item).
- Move `container-type: inline-size` to an inner wrapper if the element participates in intrinsic sizing tracks.

## Fast Searches

Use ripgrep to find likely culprits:

- `rg -n \"container-type|contain:\" src/styles`
- `rg -n \"position:\\s*(absolute|fixed|sticky)\" src/styles src/ui src/app`
- `rg -n \"overflow:\\s*(hidden|auto|scroll)\" src/styles`
- `rg -n \"min-(width|height):\\s*0\" src/styles`
- `rg -n \"grid-template|flex\" src/styles`
