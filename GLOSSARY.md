# Trail Rations

Trail Rations models the food, nutrition, and packing decisions for a
multi-day backcountry trip.

## Planning

**Plan**:
The complete set of Trail days, Plan items, and custom Foods for one trip.
_Avoid_: Itinerary, schedule

**Trail day**:
An ordered planning unit within a Plan; it is not a calendar date.
_Avoid_: Date, trip date

**Meal period**:
One of the named eating occasions within a Trail day, such as Breakfast,
Lunch, or Recovery.
_Avoid_: Meal time, time slot

**Plan item**:
A quantity of one Food or Recipe assigned to one meal period on one Trail day.
_Avoid_: Meal, food row

**Food**:
A catalog entry whose stable ID defines its identity; its name is descriptive
and may be shared or changed without creating the same Food.
_Avoid_: Product, ingredient

**Custom Food**:
A user-defined Food that belongs to a Plan rather than the bundled catalog.
_Avoid_: Manual item, personal food

**Recipe**:
A Plan-owned, one-serving composition of Food ingredients and Recipe-only
ingredients. Its stable ID defines its identity independently of its name;
create and edit drafts do not change the Plan until Save.
_Avoid_: Custom Food, meal

**Food ingredient**:
A live reference from a Recipe to a Food by stable Food ID, with a quantity
expressed in Food servings. Repeated selection of one Food increases the
existing Food ingredient quantity rather than creating another reference.
_Avoid_: Recipe Food, copied Food

**Recipe-only ingredient**:
An ingredient that belongs to one Recipe, has its own stable ID, gram weight,
and nutrition, and does not become a Food.
_Avoid_: Custom Food, manual Food

**Unresolved Plan item**:
A structurally valid Plan item whose Food ID is not currently available. Its
placement and quantity remain part of the Plan until it is replaced or removed.
_Avoid_: Invalid item, deleted row

## Packing and nutrition

**Shopping list**:
The Plan-wide aggregation of Plan-item quantities by stable Food ID.
_Avoid_: Grocery list, packing list

**Packing status**:
A temporary indication that a Shopping-list entry is packed for the current
packing session; it is not durable Plan data.
_Avoid_: Completion state, saved checkmark

**Nutrition totals**:
The summed available nutrition for a meal period, Trail day, or Plan.
Unresolved Plan items make these totals incomplete.
_Avoid_: Nutrition facts

**Electrolyte product**:
A catalog entry describing the minerals and other listed contents in one
serving of an electrolyte mix.
_Avoid_: Supplement, drink

**Supplement scenario**:
An estimate of how servings of one electrolyte product affect the sodium and
potassium gaps for a Trail day under stated conditions.
_Avoid_: Prescription, dosage

## Data safety

**Backup**:
A portable, versioned copy of the full Plan and its custom Foods.
_Avoid_: Export file, save file

**Previous valid state**:
The single recoverable Plan that immediately preceded the current valid Plan
after replacement; restoring it exchanges the two.
_Avoid_: History, autosave, archive
