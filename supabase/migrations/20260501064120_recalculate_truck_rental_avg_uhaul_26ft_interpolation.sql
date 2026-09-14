/*
  # Recalculate truck_rental_avg using U-Haul 26ft pricing table interpolation

  ## Summary
  Replaces hand-typed round-number estimates with values derived from the actual
  U-Haul 26ft one-way pricing table (sampled from uhaul.com 2024-2025).

  ## Method
  For each state, interpolate the U-Haul 26ft price at that state's
  avg_interstate_miles using the same linear interpolation the frontend uses.

  ## Pricing table (miles → 26ft price)
  57→261, 111→450, 228→554, 415→966, 577→1367, 707→1640, 806→1770,
  860→1820, 1017→1872, 1077→3132, 1646→3712, 1891→4072, 1924→4119,
  2254→4558, 2624→5054, 2790→5499

  Values are clamped to the table's max (2790 miles → $5499).
  Hawaii is left at 0 (no truck rental applicable).
*/

UPDATE state_census_data
SET truck_rental_avg = CASE
  -- Hawaii: no truck rental
  WHEN abbr = 'HI' THEN 0

  -- Below first breakpoint (57 mi): use first price
  WHEN avg_interstate_miles <= 57 THEN 261

  -- Interpolate between each pair of breakpoints
  WHEN avg_interstate_miles <= 111  THEN ROUND(261  + (avg_interstate_miles - 57)  / (111.0  - 57)   * (450  - 261))
  WHEN avg_interstate_miles <= 228  THEN ROUND(450  + (avg_interstate_miles - 111) / (228.0  - 111)  * (554  - 450))
  WHEN avg_interstate_miles <= 415  THEN ROUND(554  + (avg_interstate_miles - 228) / (415.0  - 228)  * (966  - 554))
  WHEN avg_interstate_miles <= 577  THEN ROUND(966  + (avg_interstate_miles - 415) / (577.0  - 415)  * (1367 - 966))
  WHEN avg_interstate_miles <= 707  THEN ROUND(1367 + (avg_interstate_miles - 577) / (707.0  - 577)  * (1640 - 1367))
  WHEN avg_interstate_miles <= 806  THEN ROUND(1640 + (avg_interstate_miles - 707) / (806.0  - 707)  * (1770 - 1640))
  WHEN avg_interstate_miles <= 860  THEN ROUND(1770 + (avg_interstate_miles - 806) / (860.0  - 806)  * (1820 - 1770))
  WHEN avg_interstate_miles <= 1017 THEN ROUND(1820 + (avg_interstate_miles - 860) / (1017.0 - 860)  * (1872 - 1820))
  WHEN avg_interstate_miles <= 1077 THEN ROUND(1872 + (avg_interstate_miles - 1017)/ (1077.0 - 1017) * (3132 - 1872))
  WHEN avg_interstate_miles <= 1646 THEN ROUND(3132 + (avg_interstate_miles - 1077)/ (1646.0 - 1077) * (3712 - 3132))
  WHEN avg_interstate_miles <= 1891 THEN ROUND(3712 + (avg_interstate_miles - 1646)/ (1891.0 - 1646) * (4072 - 3712))
  WHEN avg_interstate_miles <= 1924 THEN ROUND(4072 + (avg_interstate_miles - 1891)/ (1924.0 - 1891) * (4119 - 4072))
  WHEN avg_interstate_miles <= 2254 THEN ROUND(4119 + (avg_interstate_miles - 1924)/ (2254.0 - 1924) * (4558 - 4119))
  WHEN avg_interstate_miles <= 2624 THEN ROUND(4558 + (avg_interstate_miles - 2254)/ (2624.0 - 2254) * (5054 - 4558))
  WHEN avg_interstate_miles <= 2790 THEN ROUND(5054 + (avg_interstate_miles - 2624)/ (2790.0 - 2624) * (5499 - 5054))

  -- Above table max: clamp to max price
  ELSE 5499
END;
