# Use versioned backups and one atomic recovery slot

Trail Rations stores browser state behind the same version-aware parser used for
imports and portable backups. Imports and resets replace state atomically while
retaining exactly one previous valid state, trading multi-version history and
merge complexity for a small, understandable undo/redo safety boundary that
also preserves legacy unversioned state compatibility.

Serialization emits version 2. Version 2 stores Plan-owned Recipes and gives
each Plan item an explicit Food-or-Recipe target. Legacy unversioned and
version-1 state remain importable: every existing Plan item migrates to a Food
target and the Recipe collection starts empty. Version-2 state validates before
it can replace the current Plan, and unsupported future versions remain
recoverable raw data rather than being silently replaced.

Version 1 and its legacy migration retain one narrow custom-Food compatibility
allowance:
persisted `brand` and `flavor` labels may be null, and persisted serving weight
may be zero. Those values are preserved verbatim so backups do not rewrite or
drop user data; the nonblank persisted Food `name` remains the display label and
nutrition calculations treat zero weight safely. Newly created custom-Food
drafts still require both labels and a positive serving weight.
